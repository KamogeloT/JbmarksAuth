package com.example.jbmarks.chat.data

import com.google.gson.annotations.SerializedName

data class SendMessageRequest(
    @SerializedName("DIALOG_ID") val dialogId: String,
    @SerializedName("MESSAGE") val message: String,
    @SerializedName("SYSTEM") val system: String = "N",
    @SerializedName("FILES") val files: List<String>? = null // File IDs to attach
)

data class SendMessageResponse(
    @SerializedName("result") val result: Any? // Can be number (message ID) or object
)

data class SendMessageResult(
    @SerializedName("MESSAGE_ID") val messageId: String?
)
