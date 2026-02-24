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
    private let userRepository: UserRepository?
    
    init(apiClient: BitrixApiClient, userRepository: UserRepository? = nil) {
        self.apiClient = apiClient
        self.userRepository = userRepository
    }
    
    func getCalendarEvents() async throws -> [CalendarEvent] {
        // Match Android: Fetch events from multiple sources in parallel
        // 1. Fetch user's personal events
        // 2. Fetch events from user's workgroups
        
        async let userEvents = fetchUserEvents()
        async let workgroupEvents = fetchWorkgroupEvents()
        
        // Wait for both to complete and combine
        let allEvents = try await userEvents + workgroupEvents
        
        // Remove duplicates based on event ID (like Android does)
        var seenIds = Set<String>()
        let uniqueEvents = allEvents.filter { event in
            if seenIds.contains(event.id) {
                return false
            } else {
                seenIds.insert(event.id)
                return true
            }
        }
        
        print("✅ Total calendar events: \(uniqueEvents.count) (\(allEvents.count) before deduplication)")
        return uniqueEvents
    }
    
    private func fetchUserEvents() async throws -> [CalendarEvent] {
        do {
            return try await apiClient.getCalendarEvents()
        } catch {
            print("⚠️ Failed to fetch user calendar events: \(error.localizedDescription)")
            return []
        }
    }
    
    private func fetchWorkgroupEvents() async throws -> [CalendarEvent] {
        guard let userRepository = userRepository else {
            print("ℹ️ UserRepository not available, skipping workgroup events")
            return []
        }
        
        do {
            let workgroups = try await userRepository.getUserWorkgroups()
            print("📅 Found \(workgroups.count) workgroups, fetching events for each")
            
            // Fetch events for each workgroup in parallel
            let workgroupEventsArrays = try await withThrowingTaskGroup(of: [CalendarEvent].self) { group in
                for workgroup in workgroups {
                    group.addTask {
                        do {
                            return try await self.apiClient.getCalendarEvents(ownerId: workgroup.id, type: "group")
                        } catch {
                            print("⚠️ Failed to fetch events for workgroup \(workgroup.name) (\(workgroup.id)): \(error.localizedDescription)")
                            return []
                        }
                    }
                }
                
                var allEvents: [CalendarEvent] = []
                for try await events in group {
                    allEvents.append(contentsOf: events)
                }
                return allEvents
            }
            
            print("✅ Fetched \(workgroupEventsArrays.count) events from workgroups")
            return workgroupEventsArrays
        } catch {
            print("⚠️ Failed to get user workgroups: \(error.localizedDescription)")
            return []
        }
    }
}
