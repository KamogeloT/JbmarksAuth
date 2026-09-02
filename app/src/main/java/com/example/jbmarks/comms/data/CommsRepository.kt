package com.example.jbmarks.comms.data

import android.content.Context
import android.util.Log
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.chat.domain.Chat
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.user.data.UserRepository
import com.example.jbmarks.user.data.Workgroup
import com.example.jbmarks.user.data.WorkgroupMember
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Repository for workgroup communications.
 * Fetches workgroup chats, members, and manages messaging per workgroup.
 */
class CommsRepository(private val context: Context) {

    private val TAG = "CommsRepository"
    private val userRepository = UserRepository(context)
    private val chatRepository = ChatRepository(context)

    companion object {
        /** Workgroup ID that historically gated access to the Comms feature (now open to all). */
        const val MANAGEMENT_BOARD_GROUP_ID = "16"
        private const val BACKEND = "https://jbmarksauth-production.up.railway.app"
    }

    /**
     * Check if the current user has access to the Comms feature.
     * Comms is now open to every workgroup: any user who belongs to at least
     * one workgroup gets access, and each workgroup becomes a channel.
     */
    suspend fun hasCommsAccess(): Boolean {
        return try {
            val workgroups = userRepository.getUserWorkgroups().getOrDefault(emptyList())
            workgroups.isNotEmpty()
        } catch (e: Exception) {
            Log.e(TAG, "Error checking comms access", e)
            false
        }
    }

    /**
     * Get all workgroups the current user belongs to.
     * These become the available "channels" in the Comms tab.
     */
    suspend fun getUserWorkgroups(): List<Workgroup> {
        return try {
            userRepository.getUserWorkgroups().getOrDefault(emptyList())
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching workgroups", e)
            emptyList()
        }
    }

    /**
     * Get the group chat for a specific workgroup.
     * Bitrix workgroups have an associated chat with dialogId = "chatXX".
     * We fetch recent chats and find the one matching the workgroup name.
     */
    suspend fun getWorkgroupChat(workgroup: Workgroup): Chat? {
        return try {
            val recentChats = chatRepository.getRecentChats()
            // Workgroup chats in Bitrix are typically named after the group
            recentChats.find { chat ->
                chat.name.contains(workgroup.name, ignoreCase = true) ||
                chat.dialogId.startsWith("chat")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching workgroup chat for ${workgroup.name}", e)
            null
        }
    }

    /**
     * Get messages for a workgroup chat by its dialog ID.
     * Reads via the backend (webhook, full `im` scope) to avoid the per-user
     * OAuth 403 on im.dialog.messages.get. Falls back to the direct chat API.
     */
    suspend fun getMessages(dialogId: String, limit: Int = 50, lastId: String? = null): List<Message> {
        val viaBackend = getMessagesViaBackend(dialogId, limit)
        if (viaBackend != null) return viaBackend
        // Fallback to the direct (OAuth) path if the backend is unreachable
        return chatRepository.getChatMessages(dialogId, limit, lastId)
    }

    private suspend fun getMessagesViaBackend(dialogId: String, limit: Int): List<Message>? = withContext(Dispatchers.IO) {
        try {
            val url = URL("$BACKEND/api/comms/messages?dialog_id=${URLEncoder.encode(dialogId, "UTF-8")}&limit=$limit")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 12000
            conn.readTimeout = 12000
            if (conn.responseCode != 200) {
                Log.w(TAG, "Backend messages fetch HTTP ${conn.responseCode} for $dialogId")
                return@withContext null
            }
            val body = conn.inputStream.bufferedReader().readText()
            val arr = JSONObject(body).optJSONArray("messages") ?: return@withContext emptyList()
            val out = ArrayList<Message>(arr.length())
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                if (o.optBoolean("isSystem", false)) continue // skip system lines
                out.add(
                    Message(
                        id = o.optString("id"),
                        chatId = dialogId,
                        dialogId = dialogId,
                        senderId = o.optString("senderId"),
                        senderName = o.optString("senderName"),
                        text = o.optString("text"),
                        timestamp = parseIsoToMillis(o.optString("timestamp")),
                        isRead = true,
                        isDelivered = true,
                        files = emptyList()
                    )
                )
            }
            out
        } catch (e: Exception) {
            Log.w(TAG, "Backend messages fetch failed: ${e.message}")
            null
        }
    }

    /**
     * Send a message to a workgroup chat via the backend (webhook).
     */
    suspend fun sendMessage(dialogId: String, text: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val senderName = userRepository.getCurrentUser().getOrNull()?.fullName ?: ""
            val url = URL("$BACKEND/api/comms/send")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 12000
            conn.readTimeout = 12000
            val payload = JSONObject().apply {
                put("dialog_id", dialogId)
                put("message", text)
                put("sender_name", senderName)
            }.toString()
            conn.outputStream.use { it.write(payload.toByteArray()) }
            if (conn.responseCode in 200..299) {
                val resp = conn.inputStream.bufferedReader().readText()
                Result.success(JSONObject(resp).optString("messageId", "sent"))
            } else {
                // Fallback to direct chat API
                chatRepository.sendMessage(dialogId, text)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Backend send failed, falling back: ${e.message}")
            chatRepository.sendMessage(dialogId, text)
        }
    }

    /** Parse Bitrix ISO date (e.g. 2026-09-01T18:29:07+02:00) to epoch millis. */
    private fun parseIsoToMillis(iso: String): Long {
        if (iso.isBlank()) return System.currentTimeMillis()
        return try {
            val fmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", java.util.Locale.US)
            fmt.parse(iso)?.time ?: System.currentTimeMillis()
        } catch (e: Exception) {
            try {
                val fmt2 = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                fmt2.parse(iso.substringBefore("+").substringBefore("Z"))?.time ?: System.currentTimeMillis()
            } catch (e2: Exception) { System.currentTimeMillis() }
        }
    }

    /**
     * Get members of a specific workgroup.
     */
    suspend fun getWorkgroupMembers(workgroupId: String): List<WorkgroupMember> {
        return try {
            userRepository.getWorkgroupMembers(workgroupId).getOrDefault(emptyList())
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching members for workgroup $workgroupId", e)
            emptyList()
        }
    }

    /**
     * Get or create a group chat for the workgroup.
     * First checks for an existing chat linked to the workgroup entity.
     * If not found, creates one.
     */
    suspend fun getOrCreateWorkgroupChat(workgroup: Workgroup): String? {
        return try {
            // First try to find existing workgroup chat from recent chats
            val recentChats = chatRepository.getRecentChats()
            
            // Bitrix workgroup chats are named: 'Workgroup: "NAME"' or just the group name
            val existingChat = recentChats.find { chat ->
                chat.name.equals(workgroup.name, ignoreCase = true) ||
                chat.name.equals("Workgroup: \"${workgroup.name}\"", ignoreCase = true) ||
                chat.name.contains(workgroup.name, ignoreCase = true)
            }

            if (existingChat != null) {
                Log.d(TAG, "Found existing chat for ${workgroup.name}: ${existingChat.dialogId}")
                return existingChat.dialogId
            }

            // If no chat exists, create one linked to the workgroup
            val members = getWorkgroupMembers(workgroup.id)
            val memberIds = members.map { it.userId }
            
            if (memberIds.isEmpty()) {
                Log.w(TAG, "No members in workgroup ${workgroup.name}")
                return null
            }

            Log.d(TAG, "Creating new group chat for ${workgroup.name} with ${memberIds.size} members")
            val result = chatRepository.createChat(
                title = workgroup.name,
                type = "CHAT",
                userIds = memberIds
            )

            result.getOrNull()?.let { chatId -> "chat$chatId" }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting/creating workgroup chat", e)
            null
        }
    }
}
