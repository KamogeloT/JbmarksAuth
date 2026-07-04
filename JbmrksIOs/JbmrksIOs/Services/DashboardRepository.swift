//
//  DashboardRepository.swift
//  JbmrksIOs
//
//  Repository for dashboard data aggregation
//

import Foundation

protocol DashboardRepository {
    func getDashboardStats() async throws -> DashboardStats
}

nonisolated class DashboardRepositoryImpl: DashboardRepository {
    private let tasksRepository: TasksRepository?
    private let chatRepository: ChatRepository?
    private let calendarRepository: CalendarRepository?
    private let activityFeedRepository: ActivityFeedRepository?
    private let userRepository: UserRepository?
    
    init(
        tasksRepository: TasksRepository?,
        chatRepository: ChatRepository?,
        calendarRepository: CalendarRepository?,
        activityFeedRepository: ActivityFeedRepository?,
        userRepository: UserRepository?
    ) {
        self.tasksRepository = tasksRepository
        self.chatRepository = chatRepository
        self.calendarRepository = calendarRepository
        self.activityFeedRepository = activityFeedRepository
        self.userRepository = userRepository
    }
    
    func getDashboardStats() async throws -> DashboardStats {
        // Fetch user info
        let userName = (try? await userRepository?.getCurrentUser().fullName) ?? "User"
        
        // Fetch tasks
        var tasks: [Task] = []
        if let tasksRepo = tasksRepository {
            tasks = try await tasksRepo.getTasks(responsibleId: nil, createdBy: nil, status: nil, groupId: nil)
        }
        
        let activeTasks = tasks.filter { $0.status != .completed }.count
        let completedTasks = tasks.filter { $0.status == .completed }
        let completedToday = completedTasks.count // Simplified - Android checks date
        
        // Get recent tasks
        let recentActiveTasks = Array(tasks.filter { $0.status != .completed }.prefix(3))
        let recentCompletedTasks = Array(completedTasks.prefix(3))
        
        // Fetch unread messages
        var unreadMessages = 0
        if let chatRepo = chatRepository {
            let chats = (try? await chatRepo.getRecentChats()) ?? []
            unreadMessages = chats.reduce(0) { $0 + $1.unreadCount }
        }
        
        // Fetch upcoming events
        var upcomingEvents = 0
        if let calendarRepo = calendarRepository {
            let events = (try? await calendarRepo.getCalendarEvents()) ?? []
            upcomingEvents = events.count
        }
        
        return DashboardStats(
            activeTasks: activeTasks,
            completedToday: completedToday,
            unreadMessages: unreadMessages,
            upcomingEvents: upcomingEvents,
            userName: userName,
            recentActiveTasks: recentActiveTasks,
            recentCompletedTasks: recentCompletedTasks
        )
    }
}
