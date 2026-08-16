package com.example.jbmarks.comms.calling

import android.content.Context
import android.util.Log
import com.azure.android.communication.calling.*
import com.azure.android.communication.common.CommunicationTokenCredential
import com.azure.android.communication.common.CommunicationUserIdentifier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Manages Azure Communication Services calling.
 * Handles token acquisition, call agent creation, and call lifecycle.
 */
class CallingService(private val context: Context) {

    private val TAG = "CallingService"
    private val tokenUrl = "https://jbmarksauth-production.up.railway.app/api/comms/token"
    private val lookupUrl = "https://jbmarksauth-production.up.railway.app/api/comms/lookup"

    private var callAgent: CallAgent? = null
    private var callClient: CallClient? = null
    private var currentCall: Call? = null
    private var acsToken: String? = null
    private var acsUserId: String? = null

    /**
     * Initialize the calling service for the given Bitrix user.
     * Gets an ACS token and creates the call agent.
     */
    suspend fun initialize(bitrixUserId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Initializing calling service for user $bitrixUserId")

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
                    displayName = "JBmarks User $bitrixUserId"
                }

                callAgent = callClient!!.createCallAgent(context, credential, options).get()
                Log.d(TAG, "✅ Call agent created successfully")
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize calling service", e)
            Result.failure(e)
        }
    }

    /**
     * Make a 1-on-1 VoIP call to another user by their Bitrix ID.
     */
    suspend fun callUser(targetBitrixUserId: String): Result<Call> = withContext(Dispatchers.IO) {
        try {
            if (callAgent == null) {
                return@withContext Result.failure(Exception("Call agent not initialized"))
            }

            // Look up the target user's ACS identity
            val lookupResponse = lookupUser(targetBitrixUserId)
            val targetAcsUserId = lookupResponse.getString("acsUserId")

            Log.d(TAG, "Calling user $targetBitrixUserId (ACS: $targetAcsUserId)")

            val callees = arrayListOf<com.azure.android.communication.common.CommunicationIdentifier>(
                CommunicationUserIdentifier(targetAcsUserId)
            )

            val callOptions = StartCallOptions()

            withContext(Dispatchers.Main) {
                currentCall = callAgent!!.startCall(context, callees, callOptions)
                Log.d(TAG, "✅ Call started: ${currentCall?.id}")
            }

            Result.success(currentCall!!)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to call user $targetBitrixUserId", e)
            Result.failure(e)
        }
    }

    /**
     * Make a group call with multiple workgroup members.
     */
    suspend fun groupCall(targetBitrixUserIds: List<String>): Result<Call> = withContext(Dispatchers.IO) {
        try {
            if (callAgent == null) {
                return@withContext Result.failure(Exception("Call agent not initialized"))
            }

            val callees = arrayListOf<com.azure.android.communication.common.CommunicationIdentifier>()
            for (userId in targetBitrixUserIds) {
                try {
                    val lookupResponse = lookupUser(userId)
                    val acsId = lookupResponse.getString("acsUserId")
                    callees.add(CommunicationUserIdentifier(acsId))
                } catch (e: Exception) {
                    Log.w(TAG, "Could not look up user $userId for group call", e)
                }
            }

            if (callees.isEmpty()) {
                return@withContext Result.failure(Exception("No participants found"))
            }

            val callOptions = StartCallOptions()

            withContext(Dispatchers.Main) {
                currentCall = callAgent!!.startCall(context, callees, callOptions)
                Log.d(TAG, "✅ Group call started with ${callees.size} participants")
            }

            Result.success(currentCall!!)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start group call", e)
            Result.failure(e)
        }
    }

    /**
     * Hang up the current call.
     */
    fun hangUp() {
        try {
            currentCall?.hangUp(HangUpOptions())
            currentCall = null
            Log.d(TAG, "Call ended")
        } catch (e: Exception) {
            Log.e(TAG, "Error hanging up", e)
        }
    }

    /**
     * Mute/unmute microphone.
     */
    fun toggleMute(): Boolean {
        val call = currentCall ?: return false
        return try {
            if (call.isMuted) {
                call.unmute(context).get()
            } else {
                call.mute(context).get()
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
        // Speaker is managed via Android AudioManager, not ACS SDK directly
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
        val newState = !audioManager.isSpeakerphoneOn
        audioManager.isSpeakerphoneOn = newState
        return newState
    }

    /**
     * Get current call state.
     */
    fun getCallState(): CallState? = currentCall?.state

    /**
     * Check if currently in a call.
     */
    fun isInCall(): Boolean = currentCall != null && currentCall?.state != CallState.DISCONNECTED

    /**
     * Clean up resources.
     */
    fun dispose() {
        hangUp()
        callAgent?.dispose()
        callAgent = null
        callClient = null
    }

    // ── Private helpers ────────────────────────────────────────

    private fun fetchToken(userId: String): JSONObject {
        val url = URL(tokenUrl)
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
        val url = URL(lookupUrl)
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
