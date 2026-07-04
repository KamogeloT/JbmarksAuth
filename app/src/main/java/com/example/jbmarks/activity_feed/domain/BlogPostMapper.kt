package com.example.jbmarks.activity_feed.domain

import com.example.jbmarks.activity_feed.data.BlogPost as DataBlogPost

// This mapper converts the raw data blog post into our clean domain blog post.
fun mapDataToDomain(dataPost: DataBlogPost): BlogPost {
    return BlogPost(
        id = dataPost.id ?: "0", // Use a safe default
        title = dataPost.title ?: "No Title",
        text = dataPost.text ?: "",
        authorId = dataPost.authorId ?: "0",
        date = dataPost.date ?: ""
    )
}
