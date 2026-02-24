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
    @Published var events: [CalendarEvent] = []
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
            events = try await repo.getCalendarEvents()
        } catch {
            errorMessage = error.localizedDescription
            events = []
        }
        
        isLoading = false
    }
}
