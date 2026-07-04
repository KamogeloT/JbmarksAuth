//
//  DashboardStats.swift
//  JbmrksIOs
//
//  Dashboard statistics model
//

import Foundation

struct DashboardStats {
    let activeTasks: Int
    let completedToday: Int
    let unreadMessages: Int
    let upcomingEvents: Int
    let userName: String
    let recentActiveTasks: [Task]
    let recentCompletedTasks: [Task]
    
    init(
        activeTasks: Int = 0,
        completedToday: Int = 0,
        unreadMessages: Int = 0,
        upcomingEvents: Int = 0,
        userName: String = "User",
        recentActiveTasks: [Task] = [],
        recentCompletedTasks: [Task] = []
    ) {
        self.activeTasks = activeTasks
        self.completedToday = completedToday
        self.unreadMessages = unreadMessages
        self.upcomingEvents = upcomingEvents
        self.userName = userName
        self.recentActiveTasks = recentActiveTasks
        self.recentCompletedTasks = recentCompletedTasks
    }
}
