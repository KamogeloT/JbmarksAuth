package com.example.jbmarks.user.data

import android.content.Context
import com.example.jbmarks.network.RetrofitInstance

/**
 * Repository for user profile data
 */
class UserRepository(context: Context) {

    init {
        RetrofitInstance.initialize(context)
    }

    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = RetrofitInstance.api.getCurrentUser()
            Result.success(response.result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserWorkgroups(): Result<List<Workgroup>> {
        return try {
            val response = RetrofitInstance.api.getUserWorkgroups()
            Result.success(response.result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Returns workgroups where ROLE = "K" (pending invitation)
     */
    suspend fun getPendingInvitations(): Result<List<Workgroup>> {
        return try {
            val response = RetrofitInstance.api.getUserWorkgroups()
            val pending = response.result.filter { it.role == "K" }
            Result.success(pending)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Accept a workgroup invitation
     */
    suspend fun acceptInvitation(groupId: String): Result<Boolean> {
        return try {
            val response = RetrofitInstance.api.acceptWorkgroupInvitation(groupId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(Exception("Failed to accept invitation: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Decline a workgroup invitation
     */
    suspend fun declineInvitation(groupId: String): Result<Boolean> {
        return try {
            val response = RetrofitInstance.api.declineWorkgroupInvitation(groupId)
            if (response.isSuccessful) Result.success(true)
            else Result.failure(Exception("Failed to decline invitation: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get active members of a workgroup, enriched with user names.
     * Step 1: sonet_group.user.get returns USER_ID + ROLE for all active members.
     * Step 2: user.get is called for each member to resolve their display name.
     * All roles (A=owner, E=moderator, K=participant) are active members.
     */
    suspend fun getWorkgroupMembers(groupId: String): Result<List<WorkgroupMember>> {
        return try {
            val response = RetrofitInstance.api.getWorkgroupMembers(mapOf("ID" to groupId))
            val members = response.result

            // Enrich each member with their display name via user.get
            members.forEach { member ->
                try {
                    val userResponse = RetrofitInstance.api.getUser(member.userId)
                    val user = userResponse.result?.firstOrNull()
                    if (user != null) {
                        member.name = user.name
                        member.lastName = user.lastName
                        member.photoUrl = user.photoUrl
                    }
                } catch (e: Exception) {
                    // Name stays blank — fullName falls back to "User {id}"
                }
            }

            Result.success(members)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
