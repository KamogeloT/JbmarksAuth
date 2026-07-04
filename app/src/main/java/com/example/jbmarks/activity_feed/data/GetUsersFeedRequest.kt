package com.example.jbmarks.activity_feed.data

import com.google.gson.annotations.SerializedName

/**
 * Request to get feed posts for specific users
 * Bitrix24 API: log.blogpost.getusers
 */
data class GetUsersFeedRequest(
    @SerializedName("USER_ID") val userIds: List<String>? = null,
    @SerializedName("GROUP_ID") val groupIds: List<String>? = null,
    @SerializedName("FILTER") val filter: Map<String, String>? = null
)
