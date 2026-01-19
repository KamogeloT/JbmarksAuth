package com.example.jbmarks.activity_feed.data

import com.example.jbmarks.activity_feed.domain.BlogPost
import com.example.jbmarks.activity_feed.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance

class ActivityFeedRepository {

    suspend fun getFeed(): List<BlogPost> {
        // 1. Fetch the raw data from the API
        val rawData = RetrofitInstance.api.getBlogFeed().result
        // 2. Use the mapper to convert the raw data into a clean domain list
        return rawData.map { mapDataToDomain(it) }
    }
}