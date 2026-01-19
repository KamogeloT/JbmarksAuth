package com.example.jbmarks.chat.domain

enum class ChatType {
    PRIVATE, GROUP, OPEN
}

data class Chat(
    val id: String,
    val type: ChatType,
    val name: String,
    val avatar: String?,
    val lastMessage: Message?,
    val unreadCount: Int
)

data class Message(
    val id: Int,
    val senderId: Int,
    val text: String,
    val date: String
)
