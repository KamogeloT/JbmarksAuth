package com.example.jbmarks.user.data

import com.google.gson.annotations.SerializedName

/**
 * User profile data from Bitrix24
 */
data class User(
    @SerializedName("ID")
    val id: String,
    
    @SerializedName("NAME")
    val name: String,
    
    @SerializedName("LAST_NAME")
    val lastName: String,
    
    @SerializedName("EMAIL")
    val email: String? = null,
    
    @SerializedName("PERSONAL_PHOTO")
    val photoUrl: String? = null,
    
    @SerializedName("WORK_POSITION")
    val position: String? = null
) {
    val fullName: String
        get() = "$name $lastName"
}

/**
 * Workgroup data from Bitrix24
 */
data class Workgroup(
    @SerializedName("GROUP_ID")
    val id: String,
    
    @SerializedName("GROUP_NAME")
    val name: String,
    
    @SerializedName("ROLE")
    val role: String? = null,
    
    @SerializedName("GROUP_IMAGE")
    val imageUrl: String? = null
)

/**
 * API Response wrapper for Bitrix24 API
 */
data class BitrixResponse<T>(
    @SerializedName("result")
    val result: T,
    
    @SerializedName("total")
    val total: Int? = null
)

/**
 * A member of a Bitrix24 workgroup, returned by sonet_group.user.get
 * Only USER_ID and ROLE are returned — names must be fetched via user.get separately.
 * Roles: A = owner, E = moderator, K = participant (all are active members)
 */
data class WorkgroupMember(
    @SerializedName("USER_ID")
    val userId: String,

    @SerializedName("ROLE")
    val role: String? = null,

    // Populated after a separate user.get call
    var name: String? = null,
    var lastName: String? = null,
    var photoUrl: String? = null
) {
    val fullName: String
        get() = listOfNotNull(name, lastName).joinToString(" ").ifBlank { "User $userId" }

    val roleDisplayName: String
        get() = when (role) {
            "A" -> "Owner"
            "E" -> "Moderator"
            "K" -> "Member"
            else -> ""
        }
}
