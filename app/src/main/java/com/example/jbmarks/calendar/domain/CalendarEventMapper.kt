package com.example.jbmarks.calendar.domain

import com.example.jbmarks.calendar.data.CalendarEvent as DataEvent

// This mapper converts the raw data event into our clean domain event.
fun mapDataToDomain(dataEvent: DataEvent): CalendarEvent {
    return CalendarEvent(
        id = dataEvent.id ?: "0",
        name = dataEvent.name ?: "No Name",
        description = dataEvent.description ?: "",
        fromDate = dataEvent.fromDate ?: "",
        toDate = dataEvent.toDate ?: "",
        location = dataEvent.location
    )
}
