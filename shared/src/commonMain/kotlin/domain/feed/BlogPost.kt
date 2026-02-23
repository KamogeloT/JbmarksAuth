package com.example.jbmarks.shared.domain.feed

data class BlogPost(
    val id: String,
    val title: String,
    val text: String,
    val authorId: String,
    val date: String
)
