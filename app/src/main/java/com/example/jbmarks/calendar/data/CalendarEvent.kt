package com.example.jbmarks.calendar.data

import com.google.gson.annotations.SerializedName

// All fields are now nullable to prevent crashes from unexpected nulls in the API response.
data class CalendarEvent(
    @SerializedName("ID") val id: String?,
    @SerializedName("NAME") val name: String?,
    @SerializedName("DESCRIPTION") val description: String?,
    @SerializedName("DATE_FROM") val fromDate: String?,
    @SerializedName("DATE_TO") val toDate: String?,
    @SerializedName("LOCATION") val location: String?
)
