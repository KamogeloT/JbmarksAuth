package com.example.jbmarks.chat.data

import com.google.gson.annotations.SerializedName

// All fields are now nullable to prevent crashes from unexpected nulls in the API response.
data class ChatConversation(
    @SerializedName("id") val id: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("message") val lastMessage: ChatMessage?,
    @SerializedName("counter") val unreadCount: Int?,
    // Added missing fields
    @SerializedName("type") val type: String?,
    @SerializedName("avatar") val avatar: String?
)

data class ChatMessage(
    @SerializedName("id") val id: Int?,
    @SerializedName("text") val text: String?,
    @SerializedName("author_id") val authorId: Int?,
    @SerializedName("date") val date: String?
)
