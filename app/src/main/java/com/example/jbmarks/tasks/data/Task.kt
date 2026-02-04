package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

// All fields are now nullable to prevent crashes from unexpected nulls in the API response.
// Bitrix24 API returns lowercase field names: id, title, description, etc.
data class Task(
    @SerializedName("id") val id: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("responsibleId") val responsibleId: String?,
    @SerializedName("createdBy") val createdBy: String?,
    @SerializedName("accomplices") val accomplices: List<String>?,
    @SerializedName("auditors") val auditors: List<String>?,
    @SerializedName("deadline") val deadline: String?,
    @SerializedName("status") val status: String?,
    // Added the missing priority field
    @SerializedName("priority") val priority: String?,
    // Group/Project ID for workgroup filtering
    @SerializedName("groupId") val groupId: String?
)
