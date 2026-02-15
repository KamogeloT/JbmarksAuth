package com.example.jbmarks.calendar.data

import com.google.gson.annotations.SerializedName

data class CalendarEventsRequest(
    @SerializedName("filter") val filter: CalendarEventFilter? = null,
    @SerializedName("ownerId") val ownerId: String? = null,
    @SerializedName("type") val type: String? = null
)

data class CalendarEventFilter(
    @SerializedName(">FROM") val fromDate: String? = null,
    @SerializedName("<FROM") val toDate: String? = null,
    @SerializedName(">TO") val fromDateTo: String? = null,
    @SerializedName("<TO") val toDateTo: String? = null
)
