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

/**
 * Repository for workgroup communications.
 * Fetches workgroup chats, members, and manages messaging per workgroup.
 */
class CommsRepository(private val context: Context) {

    private val TAG = "CommsRepository"
    private val userRepository = UserRepository(context)
    private val chatRepository = ChatRepository(context)

    companion object {
        /** Workgroup ID that gates access to the Comms feature */
        const val MANAGEMENT_BOARD_GROUP_ID = "16"
    }

    /**
     * Check if the current user has access to the Comms feature.
     * User must be a member of the MANAGEMENT workgroup (ID 16).
     */
    suspend fun hasCommsAccess(): Boolean {
        return try {
            val workgroups = userRepository.getUserWorkgroups().getOrDefault(emptyList())
            workgroups.any { it.id == MANAGEMENT_BOARD_GROUP_ID }
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
     */
    suspend fun getMessages(dialogId: String, limit: Int = 50, lastId: String? = null): List<Message> {
        return chatRepository.getChatMessages(dialogId, limit, lastId)
    }

    /**
     * Send a message to a workgroup chat.
     */
    suspend fun sendMessage(dialogId: String, text: String): Result<String> {
        return chatRepository.sendMessage(dialogId, text)
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
