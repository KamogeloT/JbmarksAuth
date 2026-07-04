package com.example.jbmarks.chat.domain

enum class ChatType {
    PRIVATE, GROUP, OPEN
}

data class Chat(
    val id: String,
    val dialogId: String, // Original Bitrix24 dialog ID format
    val type: ChatType,
    val name: String,
    val avatar: String?,
    val lastMessage: com.example.jbmarks.chat.domain.Message?,
    val unreadCount: Int,
    val isPinned: Boolean = false,
    val lastMessageDate: Long = 0
)
