package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

// All fields are now nullable to prevent crashes from unexpected nulls in the API response.
data class Task(
    @SerializedName("ID") val id: String?,
    @SerializedName("TITLE") val title: String?,
    @SerializedName("DESCRIPTION") val description: String?,
    @SerializedName("RESPONSIBLE_ID") val responsibleId: String?,
    @SerializedName("DEADLINE") val deadline: String?,
    @SerializedName("STATUS") val status: String?,
    // Added the missing priority field
    @SerializedName("PRIORITY") val priority: String?
)
