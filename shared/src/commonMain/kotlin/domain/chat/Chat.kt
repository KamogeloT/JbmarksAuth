package com.example.jbmarks.shared.domain.chat

data class Chat(
    val id: String,
    val dialogId: String, // Original Bitrix24 dialog ID format
    val type: ChatType,
    val name: String,
    val avatar: String?,
    val lastMessage: Message?,
    val unreadCount: Int,
    val isPinned: Boolean = false,
    val lastMessageDate: Long = 0
)
