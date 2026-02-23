package com.example.jbmarks.shared.domain.calendar

data class CalendarEvent(
    val id: String,
    val name: String,
    val description: String,
    val fromDate: String,
    val toDate: String,
    val location: String?
)
