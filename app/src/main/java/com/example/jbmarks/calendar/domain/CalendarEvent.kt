package com.example.jbmarks.calendar.domain

// This is our new, rich domain model for a Calendar Event,
// inspired by the clean types you provided.
data class CalendarEvent(
    val id: String,
    val name: String,
    val description: String,
    val fromDate: String,
    val toDate: String,
    val location: String?
)
