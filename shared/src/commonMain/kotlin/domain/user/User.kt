package com.example.jbmarks.shared.domain.user

data class User(
    val id: String,
    val name: String,
    val lastName: String,
    val email: String? = null,
    val photoUrl: String? = null,
    val position: String? = null
) {
    val fullName: String
        get() = "$name $lastName"
}
