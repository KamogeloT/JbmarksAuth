package com.example.jbmarks.chat.data

import com.google.gson.annotations.SerializedName

// Avatar can be either a string or an object with url property
data class AvatarData(
    @SerializedName("url") val url: String?
)

// All fields are now nullable to prevent crashes from unexpected nulls in the API response.
data class ChatConversation(
    @SerializedName("id") val id: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("message") val lastMessage: ChatMessage?,
    @SerializedName("counter") val unreadCount: Int?,
    // Added missing fields
    @SerializedName("type") val type: String?,
    @SerializedName("avatar") val avatar: Any? // Can be String or AvatarData object
) {
    // Helper function to extract avatar URL
    fun getAvatarUrl(): String? {
        return when (avatar) {
            is String -> avatar
            is Map<*, *> -> (avatar as? Map<String, Any>)?.get("url") as? String
            else -> null
        }
    }
}

data class ChatMessage(
    @SerializedName("id") val id: Int?,
    @SerializedName("text") val text: String?,
    @SerializedName("author_id") val authorId: Int?,
    @SerializedName("date") val date: String?
)
