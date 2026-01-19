package com.example.jbmarks.tasks.data

import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.mapDataToDomain

class TasksRepository {

    suspend fun getTasks(): List<Task> {
        // 1. Fetch the raw data from the API
        val rawData = RetrofitInstance.api.getTasks().result.tasks
        // 2. Use the mapper to convert the raw data into a clean domain list
        return rawData.map { mapDataToDomain(it) }
    }
}