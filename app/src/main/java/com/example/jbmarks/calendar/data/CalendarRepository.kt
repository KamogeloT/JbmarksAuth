package com.example.jbmarks.calendar.data

import android.content.Context
import android.util.Log
import com.example.jbmarks.calendar.domain.CalendarEvent
import com.example.jbmarks.calendar.domain.mapDataToDomain
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import java.text.SimpleDateFormat
import java.util.*

class CalendarRepository(private val context: Context? = null) {
    
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
            
            // Create filter
            val filter = CalendarEventFilter(
                fromDate = today,
                toDate = oneYearFromNow
            )
            
            Log.d(TAG, "Requesting calendar events with filter: from=$today, to=$oneYearFromNow")
            
            // Fetch events from multiple sources in parallel
            coroutineScope {
                val eventsDeferred = mutableListOf<kotlinx.coroutines.Deferred<List<CalendarEvent>>>()
                
                // 1. Fetch user's personal events
                eventsDeferred.add(async {
                    try {
                        val request = CalendarEventsRequest(
                            filter = filter,
                            ownerId = ownerId,
                            type = "user"
                        )
                        val response = RetrofitInstance.api.getCalendarEvents(request)
                        if (response.isSuccessful && response.body()?.result != null) {
                            val rawData = response.body()!!.result!!
                            Log.d(TAG, "Fetched ${rawData.size} user calendar events")
                            rawData.mapNotNull { event ->
                                try {
                                    mapDataToDomain(event)
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed to map calendar event: ${e.message}", e)
                                    null
                                }
                            }
                        } else {
                            Log.w(TAG, "Failed to fetch user events: ${response.code()}")
                            emptyList()
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error fetching user calendar events", e)
                        emptyList()
                    }
                })
                
                // 2. Fetch events from user's workgroups
                if (context != null) {
                    try {
                        val userRepository = UserRepository(context)
                        val workgroupsResult = userRepository.getUserWorkgroups()
                        workgroupsResult.onSuccess { workgroups ->
                            Log.d(TAG, "Found ${workgroups.size} workgroups, fetching events for each")
                            workgroups.forEach { workgroup ->
                                eventsDeferred.add(async {
                                    try {
                                        val request = CalendarEventsRequest(
                                            filter = filter,
                                            ownerId = workgroup.id,
                                            type = "group"
                                        )
                                        val response = RetrofitInstance.api.getCalendarEvents(request)
                                        if (response.isSuccessful && response.body()?.result != null) {
                                            val rawData = response.body()!!.result!!
                                            Log.d(TAG, "Fetched ${rawData.size} events from workgroup ${workgroup.name} (${workgroup.id})")
                                            rawData.mapNotNull { event ->
                                                try {
                                                    mapDataToDomain(event)
                                                } catch (e: Exception) {
                                                    Log.w(TAG, "Failed to map calendar event: ${e.message}", e)
                                                    null
                                                }
                                            }
                                        } else {
                                            Log.w(TAG, "Failed to fetch events for workgroup ${workgroup.id}: ${response.code()}")
                                            emptyList()
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error fetching events for workgroup ${workgroup.id}", e)
                                        emptyList()
                                    }
                                })
                            }
                        }.onFailure { e ->
                            Log.w(TAG, "Failed to get user workgroups: ${e.message}")
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error getting workgroups: ${e.message}")
                    }
                }
                
                // Wait for all requests to complete and combine results
                val allEvents = eventsDeferred.awaitAll().flatten()
                
                // Remove duplicates based on event ID
                val uniqueEvents = allEvents.distinctBy { it.id }
                
                Log.d(TAG, "Total calendar events: ${uniqueEvents.size} (${allEvents.size} before deduplication)")
                uniqueEvents
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching calendar events: ${e.message}", e)
            throw e
        }
    }
}