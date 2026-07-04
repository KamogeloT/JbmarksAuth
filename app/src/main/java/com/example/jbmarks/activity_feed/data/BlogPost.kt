package com.example.jbmarks.activity_feed.data

import com.google.gson.annotations.SerializedName

data class BlogPost(
    @SerializedName("ID") val id: String?,
    @SerializedName("TITLE") val title: String?,
    @SerializedName("DETAIL_TEXT") val text: String?,
    @SerializedName("AUTHOR_ID") val authorId: String?,
    @SerializedName("POST_DATE") val date: String?
)
