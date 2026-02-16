package com.example.jbmarks.activity_feed.data

import android.util.Log
import com.example.jbmarks.activity_feed.domain.BlogPost
import com.example.jbmarks.activity_feed.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ActivityFeedRepository {
    
    private val TAG = "ActivityFeedRepository"
    
    private val _feedPosts = MutableStateFlow<List<BlogPost>>(emptyList())
    val feedPosts: StateFlow<List<BlogPost>> = _feedPosts.asStateFlow()
    
    /**
     * Get news feed messages (Activity Stream)
     * Bitrix24 API: log.blogpost.get
     */
    suspend fun getFeed(postId: String? = null): List<BlogPost> {
        return try {
            // 1. Fetch the raw data from the API
            val response = RetrofitInstance.api.getBlogFeed(postId)
            if (response.isSuccessful && response.body() != null) {
                val rawData = response.body()!!.result
                // 2. Use the mapper to convert the raw data into a clean domain list
                val posts = rawData.map { mapDataToDomain(it) }
                _feedPosts.value = posts
                posts
            } else {
                Log.e(TAG, "Failed to get feed: ${response.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting feed", e)
            emptyList()
        }
    }
    
    /**
     * Add / Post to Feed (Activity Stream)
     * Bitrix24 API: log.blogpost.add
     */
    suspend fun addFeedPost(
        message: String,
        title: String? = null,
        destinations: List<String>? = null,
        files: List<String>? = null
    ): Result<String> {
        return try {
            val request = AddBlogPostRequest(
                title = title,
                message = message,
                destinations = destinations,
                files = files
            )
            val response = RetrofitInstance.api.addBlogPost(request)
            if (response.isSuccessful && response.body()?.result != null) {
                val postId = response.body()!!.result!!
                Log.d(TAG, "Feed post added successfully: $postId")
                // Refresh feed after adding
                getFeed()
                Result.success(postId)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to add feed post: $error")
                Result.failure(Exception("Failed to add feed post: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error adding feed post", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get posts for specific users
     * Bitrix24 API: log.blogpost.getusers
     */
    suspend fun getUsersFeed(
        userIds: List<String>? = null,
        groupIds: List<String>? = null
    ): List<BlogPost> {
        return try {
            val request = GetUsersFeedRequest(
                userIds = userIds,
                groupIds = groupIds
            )
            val response = RetrofitInstance.api.getUsersFeed(request)
            if (response.isSuccessful && response.body() != null) {
                val rawData = response.body()!!.result
                val posts = rawData.map { mapDataToDomain(it) }
                _feedPosts.value = posts
                posts
            } else {
                Log.e(TAG, "Failed to get users feed: ${response.code()}")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting users feed", e)
            emptyList()
        }
    }
    
    /**
     * Get feed events (types of events that trigger feed updates)
     * Bitrix24 API: log/events
     */
    suspend fun getFeedEvents(): Result<Map<String, com.example.jbmarks.activity_feed.data.FeedEventType>> {
        return try {
            val response = RetrofitInstance.api.getFeedEvents()
            if (response.isSuccessful && response.body()?.result != null) {
                Result.success(response.body()!!.result!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get feed events: $error")
                Result.failure(Exception("Failed to get feed events: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting feed events", e)
            Result.failure(e)
        }
    }
}