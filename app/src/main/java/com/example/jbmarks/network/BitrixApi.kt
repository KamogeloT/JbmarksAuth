package com.example.jbmarks.network

import com.example.jbmarks.activity_feed.data.BlogFeedResponse
import com.example.jbmarks.calendar.data.CalendarEventsResponse
import com.example.jbmarks.chat.data.ChatRecentResponse
import com.example.jbmarks.tasks.data.TasksListResponse
import retrofit2.http.GET

interface BitrixApi {

    @GET("log.blogpost.get.json")
    suspend fun getBlogFeed(): BlogFeedResponse

    @GET("im.recent.get.json")
    suspend fun getRecentChats(): ChatRecentResponse

    @GET("tasks.task.list.json")
    suspend fun getTasks(): TasksListResponse

    @GET("calendar.event.get.json")
    suspend fun getCalendarEvents(): CalendarEventsResponse
}