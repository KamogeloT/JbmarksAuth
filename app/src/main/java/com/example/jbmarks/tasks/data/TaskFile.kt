package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Task file attachment data model
 */
data class TaskFile(
    @SerializedName("ID") val id: String?,
    @SerializedName("NAME") val name: String?,
    @SerializedName("SIZE") val size: String?,
    @SerializedName("TYPE") val type: String?,
    @SerializedName("DOWNLOAD_URL") val downloadUrl: String?,
    @SerializedName("URL") val url: String?
)

/**
 * File upload request
 */
data class FileUploadRequest(
    @SerializedName("id") val folderId: Int = 1,
    @SerializedName("data") val data: FileData,
    @SerializedName("fileContent") val fileContent: String // Base64 encoded
)

data class FileData(
    @SerializedName("NAME") val name: String
)

/**
 * File upload response
 */
data class FileUploadResponse(
    @SerializedName("result") val result: FileUploadResult?
)

data class FileUploadResult(
    @SerializedName("ID") val id: String?,
    @SerializedName("NAME") val name: String?,
    @SerializedName("SIZE") val size: String?,
    @SerializedName("TYPE") val type: String?,
    @SerializedName("DOWNLOAD_URL") val downloadUrl: String?,
    @SerializedName("URL") val url: String?
)

/**
 * Attach file to task request
 */
data class AttachFileRequest(
    @SerializedName("taskId") val taskId: String,
    @SerializedName("fileId") val fileId: String
)

/**
 * Response wrapper for file operations
 */
data class FileOperationResponse(
    @SerializedName("result") val result: Any?
)
