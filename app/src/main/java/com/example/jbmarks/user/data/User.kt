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
 */
data class WorkgroupMember(
    @SerializedName("USER_ID")
    val userId: String,

    @SerializedName("USER_NAME")
    val name: String? = null,

    @SerializedName("USER_LAST_NAME")
    val lastName: String? = null,

    @SerializedName("ROLE")
    val role: String? = null,

    @SerializedName("USER_PHOTO")
    val photoUrl: String? = null
) {
    val fullName: String
        get() = listOfNotNull(name, lastName).joinToString(" ").ifBlank { "User $userId" }

    /** Active members only — exclude pending invitations (role "K") */
    val isActive: Boolean
        get() = role != "K"
}
