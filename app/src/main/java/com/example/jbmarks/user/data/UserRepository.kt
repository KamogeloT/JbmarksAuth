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
     * Get active members of a workgroup.
     * Filters out pending invitations (role = "K") so only real members are returned.
     * Used for task delegation — you can only delegate to members of the same workgroup.
     */
    suspend fun getWorkgroupMembers(groupId: String): Result<List<WorkgroupMember>> {
        return try {
            val response = RetrofitInstance.api.getWorkgroupMembers(groupId)
            val activeMembers = response.result.filter { it.isActive }
            Result.success(activeMembers)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
