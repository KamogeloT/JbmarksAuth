package com.example.jbmarks.chat.domain

import com.example.jbmarks.chat.data.ChatConversation as DataConversation
import com.example.jbmarks.chat.data.ChatMessage as DataMessage

// This mapper converts the raw data conversation into our clean domain chat.
fun mapDataToDomain(dataConversation: DataConversation): Chat {
    val chatType = when (dataConversation.type) {
        "private" -> ChatType.PRIVATE
        "group" -> ChatType.GROUP
        "open" -> ChatType.OPEN
        else -> ChatType.GROUP // Default to group
    }

    return Chat(
        id = dataConversation.id ?: "0",
        type = chatType,
        name = dataConversation.title ?: "No Name",
        avatar = dataConversation.avatar,
        lastMessage = dataConversation.lastMessage?.let { mapDataToDomain(it) },
        unreadCount = dataConversation.unreadCount ?: 0
    )
}

// This mapper converts the raw data message into our clean domain message.
fun mapDataToDomain(dataMessage: DataMessage): Message {
    return Message(
        id = dataMessage.id ?: 0,
        senderId = dataMessage.authorId ?: 0,
        text = dataMessage.text ?: "",
        date = dataMessage.date ?: ""
    )
}
