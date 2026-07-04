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
    private let tokenStorage: TokenStorage
    private let baseUrl: String
    
    init(apiClient: BitrixApiClient, userRepository: UserRepository? = nil, tokenStorage: TokenStorage? = nil) {
        self.apiClient = apiClient
        self.userRepository = userRepository
        self.tokenStorage = tokenStorage ?? StorageFactory.shared.tokenStorage
        self.baseUrl = apiClient.baseUrl
    }
    
    private var requestHelper: APIRequestHelper {
        APIRequestHelper(baseApiClient: apiClient, tokenStorage: tokenStorage, baseUrl: baseUrl)
    }
    
    func getCalendarEvents() async throws -> [CalendarEvent] {
        // Fetch events from ALL sources in parallel:
        // 1. User's personal calendar (type: "user")
        // 2. Company calendar (type: "company" or no ownerId)
        // 3. Workgroup calendars (type: "group")
        // 4. All accessible events (no filter, get everything user can see)
        
        async let userEventsTask = fetchUserEvents()
        async let companyEventsTask = fetchCompanyEvents()
        async let workgroupEventsTask = fetchWorkgroupEvents()
        async let allAccessibleEventsTask = fetchAllAccessibleEvents()
        
        // Wait for all to complete
        let userEvents = try await userEventsTask
        let companyEvents = try await companyEventsTask
        let workgroupEvents = try await workgroupEventsTask
        let allAccessibleEvents = try await allAccessibleEventsTask
        
        // Combine all events
        let allEvents = userEvents + companyEvents + workgroupEvents + allAccessibleEvents
        
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
        print("   - User events: \(userEvents.count)")
        print("   - Company events: \(companyEvents.count)")
        print("   - Workgroup events: \(workgroupEvents.count)")
        print("   - All accessible events: \(allAccessibleEvents.count)")
        return uniqueEvents
    }
    
    private func fetchUserEvents() async throws -> [CalendarEvent] {
        do {
            // Fetch personal calendar events
            let events = try await requestHelper.executeWithTokenRefresh { client in
                try await client.getCalendarEvents(ownerId: nil, type: "user")
            }
            print("📅 Fetched \(events.count) personal calendar events")
            return events
        } catch {
            print("⚠️ Failed to fetch user calendar events: \(error.localizedDescription)")
            return []
        }
    }
    
    private func fetchCompanyEvents() async throws -> [CalendarEvent] {
        do {
            // Try fetching company calendar events
            // Company calendar might use type "company" or no ownerId with type "company"
            let events = try await requestHelper.executeWithTokenRefresh { client in
                try await client.getCalendarEvents(ownerId: nil, type: "company")
            }
            print("📅 Fetched \(events.count) company calendar events")
            return events
        } catch {
            // Company calendar might not be available or use different type
            print("ℹ️ Company calendar not available or uses different type: \(error.localizedDescription)")
            return []
        }
    }
    
    private func fetchAllAccessibleEvents() async throws -> [CalendarEvent] {
        // Try multiple strategies to get all accessible events:
        // 1. Without type (all accessible)
        // 2. With type "location" (if company uses location-based calendars)
        // 3. With type "resource" (if company uses resource calendars)
        
        var allEvents: [CalendarEvent] = []
        
        // Strategy 1: Fetch without type (should return all accessible events)
        do {
            let events = try await requestHelper.executeWithTokenRefresh { client in
                try await client.getCalendarEvents(ownerId: nil, type: "")
            }
            print("📅 Fetched \(events.count) accessible calendar events (no type filter)")
            allEvents.append(contentsOf: events)
        } catch {
            print("ℹ️ All accessible events (no type) fetch failed: \(error.localizedDescription)")
        }
        
        // Strategy 2: Try with current user's ID as owner (events where user is attendee/owner)
        // This might catch events created by others but shared with user
        // We'd need current user ID - for now skip this strategy
        // Could add if we have access to current user ID
        
        return allEvents
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
                            return try await self.requestHelper.executeWithTokenRefresh { client in
                                try await client.getCalendarEvents(ownerId: workgroup.id, type: "group")
                            }
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
