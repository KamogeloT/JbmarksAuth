package com.example.jbmarks.comms.calling

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.azure.android.communication.calling.*
import com.azure.android.communication.common.CommunicationTokenCredential
import com.azure.android.communication.common.CommunicationUserIdentifier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Singleton calling service — manages ACS calling like WhatsApp.
 * - Registers for incoming calls when user opens Comms
 * - Shows incoming call notification/ringtone
 * - Manages call lifecycle (outgoing, incoming, in-call, ended)
 */
object CallingService {

    private val TAG = "CallingService"
    private const val TOKEN_URL = "https://jbmarksauth-production.up.railway.app/api/comms/token"
    private const val LOOKUP_URL = "https://jbmarksauth-production.up.railway.app/api/comms/lookup"
    private const val CHANNEL_ID = "incoming_calls"

    private var context: Context? = null
    private var callAgent: CallAgent? = null
    private var callClient: CallClient? = null
    private var currentCall: Call? = null
    private var acsToken: String? = null
    private var acsUserId: String? = null
    private var currentBitrixUserId: String? = null

    // Observable state for UI
    private val _callState = MutableStateFlow<CallUiState>(CallUiState.Idle)
    val callState: StateFlow<CallUiState> = _callState

    private val _incomingCall = MutableStateFlow<IncomingCallInfo?>(null)
    val incomingCall: StateFlow<IncomingCallInfo?> = _incomingCall

    data class IncomingCallInfo(
        val call: IncomingCall,
        val callerDisplayName: String,
        val callerAcsId: String
    )

    sealed class CallUiState {
        object Idle : CallUiState()
        object Connecting : CallUiState()
        object Ringing : CallUiState()
        object InCall : CallUiState()
        object Ended : CallUiState()
        data class Error(val message: String) : CallUiState()
    }

    /**
     * Initialize the calling service — call this when user opens Comms tab.
     * Creates call agent and registers for incoming calls.
     */
    suspend fun initialize(ctx: Context, bitrixUserId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            context = ctx.applicationContext
            currentBitrixUserId = bitrixUserId

            Log.d(TAG, "Initializing calling service for user $bitrixUserId")

            // Dispose existing agent
            withContext(Dispatchers.Main) {
                callAgent?.dispose()
                callAgent = null
                callClient = null
            }

            // Create notification channel for incoming calls


            // Get ACS token from backend
            val tokenResponse = fetchToken(bitrixUserId)
            acsToken = tokenResponse.getString("token")
            acsUserId = tokenResponse.getString("acsUserId")

            Log.d(TAG, "Got ACS token, creating call agent...")

            // Create call client and agent on main thread
            withContext(Dispatchers.Main) {
                callClient = CallClient()

                val credential = CommunicationTokenCredential(acsToken)
                val options = CallAgentOptions().apply {
                    displayName = bitrixUserId
                }

                callAgent = callClient!!.createCallAgent(ctx.applicationContext, credential, options).get()

                // Register for incoming calls
                callAgent!!.addOnIncomingCallListener { incomingCallEvent ->
                    handleIncomingCall(incomingCallEvent)
                }

                Log.d(TAG, "✅ Call agent created + listening for incoming calls")
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize calling service", e)
            Result.failure(e)
        }
    }

    /**
     * Make a 1-on-1 VoIP call (outgoing).
     * Also sends a push notification to the target to wake their app.
     */
    suspend fun callUser(targetBitrixUserId: String, displayName: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            if (callAgent == null) {
                return@withContext Result.failure(Exception("Call agent not initialized"))
            }

            _callState.value = CallUiState.Connecting

            // Send push notification to target user FIRST (wakes their app)
            notifyCallTarget(targetBitrixUserId)

            // Look up target's ACS identity
            val lookupResponse = lookupUser(targetBitrixUserId)
            val targetAcsUserId = lookupResponse.getString("acsUserId")

            Log.d(TAG, "Calling user $targetBitrixUserId (ACS: $targetAcsUserId)")

            _callState.value = CallUiState.Ringing

            val callees = arrayListOf<com.azure.android.communication.common.CommunicationIdentifier>(
                CommunicationUserIdentifier(targetAcsUserId)
            )

            val callOptions = StartCallOptions()

            withContext(Dispatchers.Main) {
                currentCall = callAgent!!.startCall(context!!, callees, callOptions)

                // Listen for call state changes
                currentCall!!.addOnStateChangedListener {
                    onCallStateChanged(currentCall!!.state)
                }

                Log.d(TAG, "✅ Call started: ${currentCall?.id}")
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to call user", e)
            _callState.value = CallUiState.Error(e.message ?: "Call failed")
            Result.failure(e)
        }
    }

    /**
     * Send push notification to target user to wake their app for incoming call.
     */
    private fun notifyCallTarget(targetUserId: String) {
        try {
            val url = URL("https://jbmarksauth-production.up.railway.app/api/comms/call-notify")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            val body = """{"caller_user_id": "${currentBitrixUserId}", "caller_name": "JBmarks User", "target_user_id": "$targetUserId"}"""
            connection.outputStream.use { it.write(body.toByteArray()) }

            val code = connection.responseCode
            Log.d(TAG, "Call notify push sent: HTTP $code")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send call push (call still proceeds): ${e.message}")
        }
    }

    /**
     * Accept an incoming call.
     */
    fun acceptIncomingCall() {
        val incoming = _incomingCall.value ?: return
        try {
            // Stop ringing
            context?.let { CallForegroundService.stop(it) }

            val acceptOptions = AcceptCallOptions()
            currentCall = incoming.call.accept(context!!, acceptOptions).get()

            currentCall!!.addOnStateChangedListener {
                onCallStateChanged(currentCall!!.state)
            }

            _incomingCall.value = null
            _callState.value = CallUiState.InCall
            Log.d(TAG, "✅ Incoming call accepted")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to accept call", e)
            _callState.value = CallUiState.Error("Failed to accept: ${e.message}")
        }
    }

    /**
     * Reject/decline an incoming call.
     */
    fun rejectIncomingCall() {
        val incoming = _incomingCall.value ?: return
        try {
            // Stop ringing
            context?.let { CallForegroundService.stop(it) }

            incoming.call.reject()
            _incomingCall.value = null
            _callState.value = CallUiState.Idle
            Log.d(TAG, "Incoming call rejected")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to reject call", e)
        }
    }

    /**
     * Handle missed call (timeout — no answer after 45 seconds).
     */
    fun handleMissedCall(callerName: String, callerId: String) {
        Log.d(TAG, "📵 Missed call from $callerName")
        _incomingCall.value?.let {
            try { it.call.reject() } catch (_: Exception) {}
        }
        _incomingCall.value = null
        _callState.value = CallUiState.Idle

        // Show missed call notification
        context?.let { ctx ->
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            val notification = androidx.core.app.NotificationCompat.Builder(ctx, "incoming_calls")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle("Missed Call")
                .setContentText(callerName)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()
            nm.notify(4001, notification)
        }
    }

    /**
     * Hang up current call.
     */
    fun hangUp() {
        try {

            currentCall?.hangUp(HangUpOptions())
            currentCall = null
            _callState.value = CallUiState.Ended
            Log.d(TAG, "Call ended")
        } catch (e: Exception) {
            Log.e(TAG, "Error hanging up", e)
        }
    }

    /**
     * Toggle mute.
     */
    fun toggleMute(): Boolean {
        val call = currentCall ?: return false
        return try {
            if (call.isMuted) {
                call.unmute(context!!).get()
            } else {
                call.mute(context!!).get()
            }
            call.isMuted
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling mute", e)
            false
        }
    }

    /**
     * Toggle speaker.
     */
    fun toggleSpeaker(): Boolean {
        val audioManager = context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
        val newState = !audioManager.isSpeakerphoneOn
        audioManager.isSpeakerphoneOn = newState
        return newState
    }

    fun isInCall(): Boolean = currentCall != null && currentCall?.state != CallState.DISCONNECTED

    fun resetState() {
        _callState.value = CallUiState.Idle
    }

    /**
     * Clean up.
     */
    fun dispose() {
        hangUp()
        callAgent?.dispose()
        callAgent = null
        callClient = null
        _callState.value = CallUiState.Idle
    }

    // ── Private ────────────────────────────────────────────────

    private fun handleIncomingCall(event: IncomingCall) {
        Log.d(TAG, "📞 INCOMING CALL from: ${event.callerInfo.displayName}")

        val info = IncomingCallInfo(
            call = event,
            callerDisplayName = event.callerInfo.displayName ?: "Unknown",
            callerAcsId = event.callerInfo.identifier.rawId ?: ""
        )

        _incomingCall.value = info
        _callState.value = CallUiState.Ringing

        // Start persistent foreground service (ringtone + vibration + notification)
        context?.let { ctx ->
            CallForegroundService.start(ctx, info.callerDisplayName, info.callerAcsId)
        }
    }

    private fun onCallStateChanged(state: CallState) {
        Log.d(TAG, "Call state changed: $state")
        when (state) {
            CallState.CONNECTED -> {
                _callState.value = CallUiState.InCall
                // Play connection sound
                playConnectionSound()
            }
            CallState.DISCONNECTED -> {
                _callState.value = CallUiState.Ended
                currentCall = null
                context?.let { CallForegroundService.stop(it) }
                stopCallerRingtone()
            }
            CallState.RINGING -> {
                _callState.value = CallUiState.Ringing
                // Play ringing tone on caller's side
                startCallerRingtone()
            }
            CallState.CONNECTING -> _callState.value = CallUiState.Connecting
            else -> {}
        }
    }

    // ── Caller-side ringing (the "ring ring" you hear while waiting) ──

    private var callerRingtonePlayer: android.media.MediaPlayer? = null

    private fun startCallerRingtone() {
        try {
            val ctx = context ?: return
            callerRingtonePlayer = android.media.MediaPlayer().apply {
                // Use the notification sound as a ringing indicator
                val uri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
                setDataSource(ctx, uri)
                setAudioAttributes(
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not play caller ringtone: ${e.message}")
        }
    }

    private fun stopCallerRingtone() {
        callerRingtonePlayer?.stop()
        callerRingtonePlayer?.release()
        callerRingtonePlayer = null
    }

    private fun playConnectionSound() {
        try {
            val ctx = context ?: return
            val toneGen = android.media.ToneGenerator(android.media.AudioManager.STREAM_VOICE_CALL, 80)
            toneGen.startTone(android.media.ToneGenerator.TONE_PROP_ACK, 200)
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ toneGen.release() }, 300)
        } catch (e: Exception) {
            Log.w(TAG, "Could not play connection sound: ${e.message}")
        }
    }

    // ── Network helpers ────────────────────────────────────────

    private fun fetchToken(userId: String): JSONObject {
        val url = URL(TOKEN_URL)
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

    private fun lookupUser(userId: String): JSONObject {
        val url = URL(LOOKUP_URL)
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
            throw Exception("User lookup failed ($responseCode): $error")
        }

        val response = connection.inputStream.bufferedReader().readText()
        return JSONObject(response)
    }
}
