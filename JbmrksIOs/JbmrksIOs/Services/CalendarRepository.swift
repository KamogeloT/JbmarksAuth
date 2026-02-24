//
//  CalendarRepository.swift
//  JbmrksIOs
//
//  Repository for calendar events
//

import Foundation

protocol CalendarRepository {
    func getCalendarEvents() async throws -> [CalendarEvent]
}

nonisolated class CalendarRepositoryImpl: CalendarRepository {
    private let apiClient: BitrixApiClient
    
    init(apiClient: BitrixApiClient) {
        self.apiClient = apiClient
    }
    
    func getCalendarEvents() async throws -> [CalendarEvent] {
        return try await apiClient.getCalendarEvents()
    }
}
