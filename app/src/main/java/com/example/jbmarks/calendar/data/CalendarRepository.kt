package com.example.jbmarks.calendar.data

import android.content.Context
import android.util.Log
import com.example.jbmarks.calendar.domain.CalendarEvent
import com.example.jbmarks.calendar.domain.mapDataToDomain
import com.example.jbmarks.network.APIRequestHelper
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
            // Match iOS: date range from 1 year ago to 2 years from now
            // Start from beginning of today to ensure we catch today's events
            val calendar = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            
            // Get start of today
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startOfToday = calendar.time
            
            // Calculate 1 year ago
            calendar.time = startOfToday
            calendar.add(Calendar.YEAR, -1)
            val oneYearAgo = calendar.time
            
            // Calculate 2 years from now
            calendar.time = startOfToday
            calendar.add(Calendar.YEAR, 2)
            val twoYearsFromNow = calendar.time
            
            val fromDate = dateFormat.format(oneYearAgo)
            val toDate = dateFormat.format(twoYearsFromNow)
            
            // Create filter
            val filter = CalendarEventFilter(
                fromDate = fromDate,
                toDate = toDate
            )
            
            Log.d(TAG, "Requesting calendar events with filter: from=$fromDate, to=$toDate")
            
            // Create APIRequestHelper if context is available
            val apiHelper = if (context != null) APIRequestHelper(context) else null
            
            // Fetch events from multiple sources in parallel
            coroutineScope {
                val eventsDeferred = mutableListOf<kotlinx.coroutines.Deferred<List<CalendarEvent>>>()
                
                // Helper function to fetch calendar events with automatic token refresh
                suspend fun fetchEvents(type: String, ownerId: String? = null): List<CalendarEvent> {
                    return try {
                        val request = CalendarEventsRequest(
                            filter = filter,
                            ownerId = ownerId,
                            type = type
                        )
                        
                        val response = if (apiHelper != null) {
                            // Use APIRequestHelper for automatic token refresh on 401
                            apiHelper.executeWithTokenRefresh {
                                RetrofitInstance.api.getCalendarEvents(request)
                            }
                        } else {
                            // Fallback if no context (shouldn't happen in normal usage)
                            RetrofitInstance.api.getCalendarEvents(request)
                        }
                        
                        if (response.isSuccessful && response.body()?.result != null) {
                            val rawData = response.body()!!.result!!
                            Log.d(TAG, "Fetched ${rawData.size} calendar events (type=$type, ownerId=$ownerId)")
                            rawData.mapNotNull { event ->
                                try {
                                    mapDataToDomain(event)
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed to map calendar event: ${e.message}", e)
                                    null
                                }
                            }
                        } else {
                            Log.w(TAG, "Failed to fetch events (type=$type): ${response.code()}")
                            emptyList()
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error fetching calendar events (type=$type)", e)
                        emptyList()
                    }
                }
                
                // 1. Fetch user's personal events
                eventsDeferred.add(async {
                    fetchEvents("user", ownerId)
                })
                
                // 2. Fetch company calendar events (NEW - match iOS)
                if (context != null) {
                    eventsDeferred.add(async {
                        fetchEvents("company", null)
                    })
                }
                
                // 3. Fetch all accessible events (NEW - match iOS, empty type means all accessible)
                if (context != null) {
                    eventsDeferred.add(async {
                        fetchEvents("", null) // Empty type fetches all accessible events
                    })
                }
                
                // 4. Fetch events from user's workgroups
                if (context != null) {
                    try {
                        val userRepository = UserRepository(context)
                        val workgroupsResult = userRepository.getUserWorkgroups()
                        workgroupsResult.onSuccess { workgroups ->
                            Log.d(TAG, "Found ${workgroups.size} workgroups, fetching events for each")
                            workgroups.forEach { workgroup ->
                                eventsDeferred.add(async {
                                    fetchEvents("group", workgroup.id)
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