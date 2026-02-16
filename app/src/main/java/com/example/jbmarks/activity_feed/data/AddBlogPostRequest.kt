package com.example.jbmarks.activity_feed.data

import com.google.gson.annotations.SerializedName

/**
 * Request to add a new post to the feed
 * Bitrix24 API: log.blogpost.add
 */
data class AddBlogPostRequest(
    @SerializedName("POST_TITLE") val title: String? = null,
    @SerializedName("POST_MESSAGE") val message: String,
    @SerializedName("DEST") val destinations: List<String>? = null, // User IDs or group IDs
    @SerializedName("UF_BLOG_POST_FILE") val files: List<String>? = null // File IDs
)
