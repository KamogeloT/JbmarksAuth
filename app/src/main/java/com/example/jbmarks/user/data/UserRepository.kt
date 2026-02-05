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
    
    /**
     * Fetch current user profile
     */
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = RetrofitInstance.api.getCurrentUser()
            val user = response.result
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Fetch user's workgroups
     */
    suspend fun getUserWorkgroups(): Result<List<Workgroup>> {
        return try {
            val response = RetrofitInstance.api.getUserWorkgroups()
            val groups = response.result
            Result.success(groups)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
