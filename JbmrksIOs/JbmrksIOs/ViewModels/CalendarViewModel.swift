//
//  CalendarViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Calendar screen
//

import Foundation
import Combine

@MainActor
final class CalendarViewModel: ObservableObject {
    @Published var allEvents: [CalendarEvent] = [] // All loaded events
    @Published var filteredEvents: [CalendarEvent] = [] // Events for selected date
    @Published var selectedDate: Date? = nil // Selected day in calendar
    @Published var currentMonth: Date = Date() // Current month being displayed
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var calendarRepository: CalendarRepository?
    
    init() {}
    
    func loadCalendarEvents() async {
        isLoading = true
        errorMessage = nil
        
        guard let tokenStorage = StorageFactory.shared.tokenStorage.getAccessToken(),
              !tokenStorage.isEmpty else {
            errorMessage = "Not authenticated"
            isLoading = false
            return
        }
        
        let baseUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? "https://jbmarks.sdinmotion.co.za/"
        let apiClient = BitrixApiClient(baseUrl: baseUrl, accessToken: tokenStorage)
        let userRepository = RepositoryFactory.shared.userRepository()
        calendarRepository = CalendarRepositoryImpl(apiClient: apiClient, userRepository: userRepository)
        
        guard let repo = calendarRepository else {
            errorMessage = "Failed to create repository"
            isLoading = false
            return
        }
        
        do {
            allEvents = try await repo.getCalendarEvents()
            filterEventsForSelectedDate()
        } catch {
            errorMessage = error.localizedDescription
            allEvents = []
            filteredEvents = []
        }
        
        isLoading = false
    }
    
    func selectDate(_ date: Date) {
        selectedDate = date
        filterEventsForSelectedDate()
    }
    
    func clearSelection() {
        selectedDate = nil
        filteredEvents = []
    }
    
    func goToPreviousMonth() {
        if let previousMonth = Calendar.current.date(byAdding: .month, value: -1, to: currentMonth) {
            currentMonth = previousMonth
        }
    }
    
    func goToNextMonth() {
        if let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: currentMonth) {
            currentMonth = nextMonth
        }
    }
    
    func goToToday() {
        currentMonth = Date()
        selectedDate = Date()
        filterEventsForSelectedDate()
    }
    
    func getEventsForDate(_ date: Date) -> [CalendarEvent] {
        let calendar = Calendar.current
        let targetComponents = calendar.dateComponents([.year, .month, .day], from: date)
        
        return allEvents.filter { event in
            // Check both fromDate and toDate to catch events that span multiple days
            let eventDates = [event.fromDate, event.toDate].compactMap { $0 }
            
            for eventDateString in eventDates {
                // Parse event date - handle various Bitrix24 formats
                let dateFormatter = DateFormatter()
                dateFormatter.locale = Locale(identifier: "en_US_POSIX")
                
                // Try different date formats that Bitrix24 uses
                let formats = [
                    "MM/dd/yyyy hh:mm:ss a",      // "02/16/2026 09:30:00 pm"
                    "MM/dd/yyyy",                 // "02/16/2026"
                    "yyyy-MM-dd'T'HH:mm:ss",      // "2026-02-16T21:30:00"
                    "yyyy-MM-dd'T'HH:mm:ssZ",     // With timezone
                    "yyyy-MM-dd",                 // "2026-02-16"
                    "dd/MM/yyyy",                 // Alternative format
                    "EEE, MMM d, yyyy"            // "Mon, Feb 16, 2026"
                ]
                
                for format in formats {
                    dateFormatter.dateFormat = format
                    // Try with current timezone first
                    if let eventDate = dateFormatter.date(from: eventDateString) {
                        if calendar.isDate(eventDate, inSameDayAs: date) {
                            return true
                        }
                    }
                    
                    // Try with UTC timezone
                    dateFormatter.timeZone = TimeZone(identifier: "UTC")
                    if let eventDate = dateFormatter.date(from: eventDateString) {
                        if calendar.isDate(eventDate, inSameDayAs: date) {
                            return true
                        }
                    }
                    
                    // Reset timezone
                    dateFormatter.timeZone = TimeZone.current
                }
                
                // Fallback: extract date components from string
                if let year = targetComponents.year,
                   let month = targetComponents.month,
                   let day = targetComponents.day {
                    // Check for various date patterns in the string
                    let patterns = [
                        String(format: "%02d/%02d/%04d", month, day, year),  // MM/dd/yyyy
                        String(format: "%04d-%02d-%02d", year, month, day),   // yyyy-MM-dd
                        String(format: "%02d/%02d/%04d", day, month, year)     // dd/MM/yyyy
                    ]
                    
                    for pattern in patterns {
                        if eventDateString.contains(pattern) {
                            return true
                        }
                    }
                }
            }
            
            return false
        }
    }
    
    func hasEventsOnDate(_ date: Date) -> Bool {
        return !getEventsForDate(date).isEmpty
    }
    
    private func filterEventsForSelectedDate() {
        guard let selectedDate = selectedDate else {
            filteredEvents = []
            return
        }
        filteredEvents = getEventsForDate(selectedDate)
    }
}
