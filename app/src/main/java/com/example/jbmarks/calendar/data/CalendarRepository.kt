package com.example.jbmarks.calendar.data

import com.example.jbmarks.calendar.domain.CalendarEvent
import com.example.jbmarks.calendar.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance

class CalendarRepository {

    suspend fun getCalendarEvents(): List<CalendarEvent> {
        // 1. Fetch the raw data from the API
        val rawData = RetrofitInstance.api.getCalendarEvents().result
        // 2. Use the mapper to convert the raw data into a clean domain list
        return rawData.map { mapDataToDomain(it) }
    }
}