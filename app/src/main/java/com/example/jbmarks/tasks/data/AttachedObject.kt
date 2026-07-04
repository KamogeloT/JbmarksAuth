package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Response from disk.attachedObject.get.json
 * Used specifically for task attachments with webhook authentication
 */
data class AttachedObject(
    @SerializedName("ID") val id: String?,
    @SerializedName("id") val idLower: String?,
    @SerializedName("NAME") val name: String?,
    @SerializedName("name") val nameLower: String?,
    @SerializedName("SIZE") val size: String?,
    @SerializedName("size") val sizeLower: String?,
    @SerializedName("TYPE") val type: String?,
    @SerializedName("type") val typeLower: String?,
    @SerializedName("DOWNLOADABLE_URL") val downloadableUrl: String?,
    @SerializedName("downloadableUrl") val downloadableUrlLower: String?,
    @SerializedName("DOWNLOAD_URL") val downloadUrl: String?,
    @SerializedName("downloadUrl") val downloadUrlLower: String?,
    @SerializedName("URL") val url: String?,
    @SerializedName("url") val urlLower: String?
) {
    fun getIdValue(): String? = id ?: idLower
    fun getNameValue(): String? = name ?: nameLower
    fun getSizeValue(): String? = size ?: sizeLower
    fun getTypeValue(): String? = type ?: typeLower
    fun getDownloadableUrlValue(): String? = downloadableUrl ?: downloadableUrlLower ?: downloadUrl ?: downloadUrlLower ?: url ?: urlLower
}

/**
 * Response wrapper for attached object
 */
data class AttachedObjectResponse(
    @SerializedName("result") val result: AttachedObject?,
    @SerializedName("error") val error: String?,
    @SerializedName("error_description") val errorDescription: String?
)
