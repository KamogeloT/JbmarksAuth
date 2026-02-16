package com.example.jbmarks.activity_feed.data

/**
 * Response containing feed event types
 * Bitrix24 API: log/events
 */
data class FeedEventsResponse(
    val result: Map<String, FeedEventType>?
)

/**
 * Feed event type information
 */
data class FeedEventType(
    val name: String?,
    val description: String?
)
