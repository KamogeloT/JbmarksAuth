package com.example.jbmarks.comms.calling

import android.content.Context
import android.util.Log
import com.azure.android.communication.calling.*
import com.azure.android.communication.common.CommunicationTokenCredential
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Calling Service — Room-based approach (like WhatsApp).
 *
 * Flow:
 * 1. Caller creates a room ID + gets ACS token
 * 2. Caller joins the room and starts waiting
 * 3. Backend sends FCM push to receiver with room ID + caller info
 * 4. Receiver sees full-screen notification → taps Accept
 * 5. Receiver gets ACS token + joins the same room
 * 6. Both are connected — call is live
 *
 * No timing issues — receiver joins when ready.
 */
object CallingService {

    private val TAG = "CallingService"
    private const val BASE_URL = "https://jbmarksauth-production.up.railway.app"

    private var context: Context? = null
    private var callClient: CallClient? = null
    private var callAgent: CallAgent? = null
    private var currentCall: Call? = null
    private var currentRoomId: String? = null
    private var currentBitrixUserId: String? = null

    // Observable state
    private val _callState = MutableStateFlow<CallUiState>(CallUiState.Idle)
    val callState: StateFlow<CallUiState> = _callState

    // When true, the incoming-call UI should auto-accept (user tapped Answer in
    // the notification). Consumed once by the UI.
    private val _autoAccept = MutableStateFlow(false)
    val autoAccept: StateFlow<Boolean> = _autoAccept

    /** Restore incoming-call state from notification extras (survives process death). */
    fun restoreIncomingCall(
        callerName: String,
        callerUserId: String,
        roomId: String,
        autoAccept: Boolean,
        isGroup: Boolean = false,
        groupName: String = ""
    ) {
        currentRoomId = roomId
        _isGroupCall.value = isGroup
        _callState.value = CallUiState.IncomingCall(callerName, roomId, callerUserId, isGroup, groupName)
        _autoAccept.value = autoAccept
    }

    fun consumeAutoAccept(): Boolean {
        val v = _autoAccept.value
        _autoAccept.value = false
        return v
    }

    sealed class CallUiState {
        object Idle : CallUiState()
        object Connecting : CallUiState()
        object WaitingForAnswer : CallUiState()
        object InCall : CallUiState()
        object Ended : CallUiState()
        data class IncomingCall(
            val callerName: String,
            val roomId: String,
            val callerUserId: String,
            val isGroup: Boolean = false,
            val groupName: String = ""
        ) : CallUiState()
        data class Error(val message: String) : CallUiState()
    }

    // Live participant roster (display names) for conference calls.
    private val _participants = MutableStateFlow<List<String>>(emptyList())
    val participants: StateFlow<List<String>> = _participants

    // Whether the current call is a group/conference call.
    private val _isGroupCall = MutableStateFlow(false)
    val isGroupCall: StateFlow<Boolean> = _isGroupCall

    private fun refreshParticipants() {
        try {
            val remote = currentCall?.remoteParticipants ?: emptyList()
            val names = remote.mapNotNull { p ->
                p.displayName?.takeIf { it.isNotBlank() } ?: "Participant"
            }
            _participants.value = names
        } catch (_: Exception) { /* roster read best-effort */ }
    }

    // ═══════════════════════════════════════════════════════════
    // OUTGOING CALL (Caller)
    // ═══════════════════════════════════════════════════════════

    /**
     * Start a call to another user.
     * Creates a room, joins it, then sends push to the target.
     */
    suspend fun startCall(
        ctx: Context,
        callerBitrixUserId: String,
        callerName: String,
        targetBitrixUserId: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            context = ctx.applicationContext
            currentBitrixUserId = callerBitrixUserId

            _callState.value = CallUiState.Connecting

            // 1. Generate a unique room ID for this call
            val roomId = UUID.randomUUID().toString()
            currentRoomId = roomId
            Log.d(TAG, "📞 Starting call. Room: $roomId")

            // 2. Get ACS token for caller
            val tokenResponse = fetchToken(callerBitrixUserId)
            val token = tokenResponse.getString("token")

            // 3. Create call agent and join the room (group call with room ID)
            withContext(Dispatchers.Main) {
                callAgent?.dispose()
                callClient = CallClient()
                val credential = CommunicationTokenCredential(token)
                val options = CallAgentOptions().apply {
                    displayName = callerName
                }
                callAgent = callClient!!.createCallAgent(ctx.applicationContext, credential, options).get()

                // Join as a group call using the room ID as the group ID
                val groupId = UUID.fromString(roomId)
                val joinOptions = JoinCallOptions()
                currentCall = callAgent!!.join(ctx.applicationContext, GroupCallLocator(groupId), joinOptions)

                currentCall?.addOnStateChangedListener {
                    val state = currentCall?.state ?: return@addOnStateChangedListener
                    handleCallStateChange(state)
                }

                // Listen for participants joining (receiver accepted)
                currentCall?.addOnRemoteParticipantsUpdatedListener { args ->
                    if (args.addedParticipants.isNotEmpty()) {
                        Log.d(TAG, "✅ Receiver joined the call!")
                        _callState.value = CallUiState.InCall
                    }
                }
            }

            _callState.value = CallUiState.WaitingForAnswer
            Log.d(TAG, "📞 Joined room, waiting for receiver...")

            // 4. Send push notification to receiver with room ID
            sendCallPush(callerBitrixUserId, callerName, targetBitrixUserId, roomId)

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start call", e)
            _callState.value = CallUiState.Error(e.message ?: "Call failed")
            Result.failure(e)
        }
    }

    /**
     * Start a CONFERENCE call to an entire group (Teams-style).
     * Creates one room, joins it, and rings every member. Each member
     * accepts/declines independently and joins the same room.
     */
    suspend fun startGroupCall(
        ctx: Context,
        callerBitrixUserId: String,
        callerName: String,
        groupName: String,
        memberUserIds: List<String>
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            context = ctx.applicationContext
            currentBitrixUserId = callerBitrixUserId
            _isGroupCall.value = true
            _callState.value = CallUiState.Connecting

            val roomId = UUID.randomUUID().toString()
            currentRoomId = roomId
            Log.d(TAG, "📞 Starting GROUP call. Room: $roomId, members: ${memberUserIds.size}")

            val tokenResponse = fetchToken(callerBitrixUserId)
            val token = tokenResponse.getString("token")

            withContext(Dispatchers.Main) {
                callAgent?.dispose()
                callClient = CallClient()
                val credential = CommunicationTokenCredential(token)
                val options = CallAgentOptions().apply { displayName = callerName }
                callAgent = callClient!!.createCallAgent(ctx.applicationContext, credential, options).get()

                val groupId = UUID.fromString(roomId)
                currentCall = callAgent!!.join(ctx.applicationContext, GroupCallLocator(groupId), JoinCallOptions())

                currentCall?.addOnStateChangedListener {
                    val state = currentCall?.state ?: return@addOnStateChangedListener
                    handleCallStateChange(state)
                }
                currentCall?.addOnRemoteParticipantsUpdatedListener {
                    refreshParticipants()
                    if ((currentCall?.remoteParticipants?.size ?: 0) > 0) {
                        _callState.value = CallUiState.InCall
                    }
                }
            }

            _callState.value = CallUiState.WaitingForAnswer
            _participants.value = listOf(callerName)

            // Ring everyone in the group
            sendGroupCallPush(callerBitrixUserId, callerName, groupName, roomId, memberUserIds)

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start group call", e)
            _callState.value = CallUiState.Error(e.message ?: "Group call failed")
            Result.failure(e)
        }
    }

    // ═══════════════════════════════════════════════════════════
    // INCOMING CALL (Receiver)
    // ═══════════════════════════════════════════════════════════

    /**
     * Called when FCM push arrives with call data.
     * Shows the incoming call state (UI will react).
     */
    fun onIncomingCallPush(
        callerName: String,
        callerUserId: String,
        roomId: String,
        isGroup: Boolean = false,
        groupName: String = ""
    ) {
        Log.d(TAG, "📞 Incoming ${if (isGroup) "GROUP " else ""}call push: $callerName, room: $roomId")
        currentRoomId = roomId
        _isGroupCall.value = isGroup
        _callState.value = CallUiState.IncomingCall(callerName, roomId, callerUserId, isGroup, groupName)
    }

    /**
     * Accept the incoming call — join the room.
     */
    suspend fun acceptCall(
        ctx: Context,
        receiverBitrixUserId: String,
        receiverName: String,
        roomId: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            context = ctx.applicationContext
            currentBitrixUserId = receiverBitrixUserId

            _callState.value = CallUiState.Connecting
            Log.d(TAG, "Accepting call, joining room: $roomId")

            // Get ACS token for receiver
            val tokenResponse = fetchToken(receiverBitrixUserId)
            val token = tokenResponse.getString("token")

            // Join the same room on main thread
            withContext(Dispatchers.Main) {
                try {
                    callAgent?.dispose()
                    callAgent = null
                    callClient = null

                    callClient = CallClient()
                    val credential = CommunicationTokenCredential(token)
                    val options = CallAgentOptions().apply {
                        displayName = receiverName
                    }
                    callAgent = callClient!!.createCallAgent(ctx.applicationContext, credential, options).get()

                    val groupId = UUID.fromString(roomId)
                    val joinOptions = JoinCallOptions()
                    currentCall = callAgent!!.join(ctx.applicationContext, GroupCallLocator(groupId), joinOptions)

                    currentCall?.addOnStateChangedListener {
                        val state = currentCall?.state ?: return@addOnStateChangedListener
                        handleCallStateChange(state)
                    }
                    currentCall?.addOnRemoteParticipantsUpdatedListener {
                        refreshParticipants()
                    }
                    refreshParticipants()

                    Log.d(TAG, "✅ Joined call room — connected!")
                } catch (e: Exception) {
                    Log.e(TAG, "Error joining room on main thread", e)
                    _callState.value = CallUiState.Error("Failed to join: ${e.message}")
                }
            }

            _callState.value = CallUiState.InCall

            // Stop the foreground service (ringtone + notification)
            CallForegroundService.stop(ctx.applicationContext)

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to accept call", e)
            _callState.value = CallUiState.Error(e.message ?: "Failed to join")
            Result.failure(e)
        }
    }

    /**
     * Decline the incoming call.
     */
    fun declineCall(ctx: Context) {
        Log.d(TAG, "❌ Call declined")
        _callState.value = CallUiState.Idle
        currentRoomId = null
        CallForegroundService.stop(ctx)
    }

    // ═══════════════════════════════════════════════════════════
    // SHARED
    // ═══════════════════════════════════════════════════════════

    fun hangUp() {
        try {
            currentCall?.hangUp(HangUpOptions())
            currentCall = null
            currentRoomId = null
            _participants.value = emptyList()
            _isGroupCall.value = false
            _callState.value = CallUiState.Ended
            context?.let { CallForegroundService.stop(it) }
            Log.d(TAG, "Call ended")
        } catch (e: Exception) {
            Log.e(TAG, "Error hanging up", e)
        }
    }

    fun toggleMute(): Boolean {
        val call = currentCall ?: return false
        val ctx = context ?: return call.isMuted
        return try {
            if (call.isMuted) {
                call.unmute(ctx).get()
            } else {
                call.mute(ctx).get()
            }
            call.isMuted
        } catch (e: Exception) {
            Log.e(TAG, "Mute toggle error", e)
            call.isMuted
        }
    }

    fun toggleSpeaker(): Boolean {
        val audioManager = context?.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager ?: return false
        return try {
            val newState = !audioManager.isSpeakerphoneOn
            audioManager.isSpeakerphoneOn = newState
            newState
        } catch (e: Exception) {
            Log.e(TAG, "Speaker toggle error", e)
            false
        }
    }

    fun isInCall(): Boolean = currentCall != null && currentCall?.state != CallState.DISCONNECTED

    fun resetState() {
        _callState.value = CallUiState.Idle
    }

    fun dispose() {
        hangUp()
        callAgent?.dispose()
        callAgent = null
        callClient = null
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE
    // ═══════════════════════════════════════════════════════════

    private fun handleCallStateChange(state: CallState) {
        Log.d(TAG, "Call state: $state")
        when (state) {
            CallState.CONNECTED -> {
                _callState.value = CallUiState.InCall
                playConnectionSound()
            }
            CallState.DISCONNECTED -> {
                _callState.value = CallUiState.Ended
                currentCall = null
            }
            else -> {}
        }
    }

    private fun playConnectionSound() {
        try {
            val toneGen = android.media.ToneGenerator(android.media.AudioManager.STREAM_VOICE_CALL, 80)
            toneGen.startTone(android.media.ToneGenerator.TONE_PROP_ACK, 200)
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ toneGen.release() }, 300)
        } catch (_: Exception) {}
    }

    private fun sendGroupCallPush(
        callerUserId: String,
        callerName: String,
        groupName: String,
        roomId: String,
        memberUserIds: List<String>
    ) {
        try {
            val url = URL("$BASE_URL/api/comms/group-call-notify")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            val body = JSONObject().apply {
                put("caller_user_id", callerUserId)
                put("caller_name", callerName)
                put("group_name", groupName)
                put("room_id", roomId)
                put("member_user_ids", org.json.JSONArray(memberUserIds))
            }.toString()

            connection.outputStream.use { it.write(body.toByteArray()) }
            Log.d(TAG, "Group call push sent: HTTP ${connection.responseCode}")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send group call push: ${e.message}")
        }
    }

    private fun sendCallPush(callerUserId: String, callerName: String, targetUserId: String, roomId: String) {
        try {
            val url = URL("$BASE_URL/api/comms/call-notify")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            val body = JSONObject().apply {
                put("caller_user_id", callerUserId)
                put("caller_name", callerName)
                put("target_user_id", targetUserId)
                put("room_id", roomId)
            }.toString()

            connection.outputStream.use { it.write(body.toByteArray()) }
            val code = connection.responseCode
            Log.d(TAG, "Call push sent: HTTP $code")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send call push: ${e.message}")
        }
    }

    private fun fetchToken(userId: String): JSONObject {
        val url = URL("$BASE_URL/api/comms/token")
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true
        connection.connectTimeout = 15000
        connection.readTimeout = 15000

        val body = """{"user_id": "$userId"}"""
        connection.outputStream.use { it.write(body.toByteArray()) }

        val responseCode = connection.responseCode
        if (responseCode != 200) {
            val error = connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
            throw Exception("Token fetch failed ($responseCode): $error")
        }

        val response = connection.inputStream.bufferedReader().readText()
        return JSONObject(response)
    }
}
