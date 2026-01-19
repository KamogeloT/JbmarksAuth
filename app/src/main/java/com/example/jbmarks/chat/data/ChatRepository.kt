package com.example.jbmarks.chat.data

import com.example.jbmarks.chat.domain.Chat
import com.example.jbmarks.chat.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance

class ChatRepository {

    suspend fun getRecentChats(): List<Chat> {
        // 1. Fetch the raw data from the API
        val rawData = RetrofitInstance.api.getRecentChats().result
        // 2. Use the mapper to convert the raw data into a clean domain list
        return rawData.map { mapDataToDomain(it) }
    }
}