package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

data class FileDetails(
    @SerializedName("ID") val id: String?,
    @SerializedName("id") val idLower: String?,
    @SerializedName("NAME") val name: String?,
    @SerializedName("name") val nameLower: String?,
    @SerializedName("SIZE") val size: String?,
    @SerializedName("size") val sizeLower: String?,
    @SerializedName("TYPE") val type: String?,
    @SerializedName("type") val typeLower: String?,
    @SerializedName("DOWNLOAD_URL") val downloadUrl: String?,
    @SerializedName("downloadUrl") val downloadUrlLower: String?,
    @SerializedName("URL") val url: String?,
    @SerializedName("url") val urlLower: String?
) {
    fun getIdValue(): String? = id ?: idLower
    fun getNameValue(): String? = name ?: nameLower
    fun getSizeValue(): String? = size ?: sizeLower
    fun getTypeValue(): String? = type ?: typeLower
    fun getDownloadUrlValue(): String? = downloadUrl ?: downloadUrlLower ?: url ?: urlLower
}
