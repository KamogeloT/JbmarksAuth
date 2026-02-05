package com.example.jbmarks.chat.data

import com.example.jbmarks.user.data.BitrixResponse
import com.google.gson.annotations.SerializedName

data class ChatMessagesResponse(
    @SerializedName("result") val result: MessagesResult?
)

data class MessagesResult(
    @SerializedName("messages") val messages: List<MessageDto>?
)

data class MessageDto(
    @SerializedName("id") val id: String?,
    @SerializedName("author_id") val authorId: String?,
    @SerializedName("text") val text: String?,
    @SerializedName("date") val date: String?,
    @SerializedName("unread") val unread: String?,
    @SerializedName("files") val files: List<MessageFileDto>?
)

data class MessageFileDto(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("size") val size: String?,
    @SerializedName("type") val type: String?,
    @SerializedName("urlDownload") val downloadUrl: String?,
    @SerializedName("urlPreview") val previewUrl: String?
)
