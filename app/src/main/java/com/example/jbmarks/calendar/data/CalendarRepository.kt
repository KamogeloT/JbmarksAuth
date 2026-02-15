package com.example.jbmarks.calendar.data

import android.util.Log
import com.example.jbmarks.calendar.domain.CalendarEvent
import com.example.jbmarks.calendar.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance
import java.text.SimpleDateFormat
import java.util.*

class CalendarRepository {
    
    companion object {
        private const val TAG = "CalendarRepository"
    }

    suspend fun getCalendarEvents(ownerId: String? = null): List<CalendarEvent> {
        return try {
            // Get current date and date 1 year from now for the filter
            val calendar = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            
            val today = dateFormat.format(calendar.time)
            calendar.add(Calendar.YEAR, 1)
            val oneYearFromNow = dateFormat.format(calendar.time)
            
            // Create request with filter
            val filter = CalendarEventFilter(
                fromDate = today,
                toDate = oneYearFromNow
            )
            val request = CalendarEventsRequest(
                filter = filter,
                ownerId = ownerId,
                type = "user" // Default to user calendar
            )
            
            Log.d(TAG, "Requesting calendar events with filter: from=$today, to=$oneYearFromNow, ownerId=$ownerId")
            
            // 1. Fetch the raw data from the API with POST body
            val response = RetrofitInstance.api.getCalendarEvents(request)
            
            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "HTTP ${response.code()} error fetching calendar events: $errorBody")
                throw Exception("HTTP ${response.code()}: $errorBody")
            }
            
            val responseBody = response.body()
            if (responseBody == null) {
                Log.e(TAG, "Response body is null")
                throw Exception("Response body is null")
            }
            
            val rawData = responseBody.result ?: emptyList()
            
            Log.d(TAG, "Fetched ${rawData.size} calendar events from API")
            
            // 2. Use the mapper to convert the raw data into a clean domain list
            rawData.mapNotNull { event ->
                try {
                    mapDataToDomain(event)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to map calendar event: ${e.message}", e)
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching calendar events: ${e.message}", e)
            throw e
        }
    }
}