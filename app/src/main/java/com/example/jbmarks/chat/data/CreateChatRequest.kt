package com.example.jbmarks.chat.data

import com.google.gson.annotations.SerializedName

data class CreateChatRequest(
    @SerializedName("TITLE") val title: String?,
    @SerializedName("TYPE") val type: String, // "OPEN" or "CHAT"
    @SerializedName("USERS") val users: List<String>?
)

data class CreateChatResponse(
    @SerializedName("result") val result: CreateChatResult?
)

data class CreateChatResult(
    @SerializedName("CHAT_ID") val chatId: String?
)
