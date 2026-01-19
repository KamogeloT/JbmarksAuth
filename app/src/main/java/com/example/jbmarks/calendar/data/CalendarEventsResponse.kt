package com.example.jbmarks.calendar.data

import com.google.gson.annotations.SerializedName

data class CalendarEventsResponse(
    @SerializedName("result") val result: List<CalendarEvent>
)
