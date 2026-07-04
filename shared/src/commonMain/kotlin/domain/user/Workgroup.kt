package com.example.jbmarks.shared.domain.user

data class Workgroup(
    val id: String,
    val name: String,
    val role: String? = null,
    val imageUrl: String? = null
)
