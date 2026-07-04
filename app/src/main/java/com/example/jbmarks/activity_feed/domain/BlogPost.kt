package com.example.jbmarks.activity_feed.domain

// This is our new, rich domain model for a blog post,
// inspired by the clean types you provided.
data class BlogPost(
    val id: String,
    val title: String,
    val text: String,
    val authorId: String,
    val date: String
)
