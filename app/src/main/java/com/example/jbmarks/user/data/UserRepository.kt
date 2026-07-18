package com.example.jbmarks.user.data

import android.content.Context
import com.example.jbmarks.network.RetrofitInstance

/**
 * Repository for user profile data
 */
class UserRepository(private val context: Context) {

    private val tokenManager = com.example.jbmarks.auth.data.TokenManager(context)

    init {
        RetrofitInstance.initialize(context)
    }

    /**
     * Get current user. Returns cached profile instantly if available,
     * and refreshes from API in the background.
     */
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = RetrofitInstance.api.getCurrentUser()
            val user = response.result
            // Update cache with fresh data
            tokenManager.saveUserProfile(
                id = user.id,
                name = user.name,
                lastName = user.lastName,
                email = user.email,
                photoUrl = user.photoUrl,
                position = user.position
            )
            Result.success(user)
        } catch (e: Exception) {
            // If network fails, try returning cached profile
            val cachedUser = getCachedUser()
            if (cachedUser != null) {
                Result.success(cachedUser)
            } else {
                Result.failure(e)
            }
        }
    }

    /**
     * Get cached user profile from local storage (no network call).
     * Returns null if no profile is cached.
     */
    fun getCachedUser(): User? {
        val id = tokenManager.getUserId() ?: return null
        val name = tokenManager.getUserName() ?: return null
        val lastName = tokenManager.getUserLastName() ?: ""
        return User(
            id = id,
            name = name,
            lastName = lastName,
            email = tokenManager.getUserEmail(),
            photoUrl = tokenManager.getUserPhotoUrl(),
            position = tokenManager.getUserPosition()
        )
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
     * Returns workgroups with a genuine pending invitation.
     *
     * NOTE: Bitrix24's `sonet_group.user.groups` only returns groups the user
     * is already an active member of. The ROLE values returned (A=owner,
     * E=moderator, K=participant) all represent active membership — none of
     * them indicate a pending invitation.
     *
     * Bitrix24 does not expose a dedicated REST endpoint to list pending
     * inbound invitations for the current user. Therefore this method now
     * returns an empty list. True invitation handling would require a server-
     * side component (webhook/workflow) that tracks invitations and exposes
     * them via a custom endpoint.
     */
    suspend fun getPendingInvitations(): Result<List<Workgroup>> {
        // sonet_group.user.groups never contains pending invitations —
        // role "K" means the user is already an active participant.
        return Result.success(emptyList())
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
