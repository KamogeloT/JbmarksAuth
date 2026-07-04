//
//  DashboardView.swift
//  JbmrksIOs
//
//  Dashboard screen matching Android design
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @Binding var selectedTab: TabItem
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Overview Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Overview")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 20)
                    
                    StatsGrid(stats: viewModel.stats, selectedTab: $selectedTab)
                }
                
                // Quick Actions Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick Actions")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 20)
                    
                    QuickActionsRow(selectedTab: $selectedTab)
                }
                
                // Recent Activity Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Activity")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 20)
                    
                    if viewModel.recentActivity.isEmpty {
                        Text("No recent activity")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .padding(.horizontal, 20)
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(viewModel.recentActivity) { post in
                                    CompactBlogPostItem(post: post)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }
                }
            }
            .padding(.vertical, 16)
        }
        .navigationTitle("Dashboard")
        .task {
            await viewModel.loadDashboard()
        }
        .refreshable {
            await viewModel.loadDashboard()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshDashboard"))) { _ in
            _Concurrency.Task { @MainActor in
                await viewModel.loadDashboard()
            }
        }
    }
}

// MARK: - Stats Grid
struct StatsGrid: View {
    let stats: DashboardStats
    @Binding var selectedTab: TabItem
    
    var body: some View {
        VStack(spacing: 12) {
            // First Row: Active Tasks and Completed
            HStack(spacing: 12) {
                StatCard(
                    title: "Active Tasks",
                    value: "\(stats.activeTasks)",
                    icon: "list.bullet",
                    color: Color(red: 0.9, green: 0.85, blue: 1.0),
                    textColor: .primary,
                    onTap: { selectedTab = .tasks }
                )
                
                StatCard(
                    title: "Completed",
                    value: "\(stats.completedToday)",
                    subtitle: "Today",
                    icon: "checkmark.circle.fill",
                    color: Color(red: 0.9, green: 0.9, blue: 0.95),
                    textColor: .primary,
                    onTap: { selectedTab = .tasks }
                )
            }
            
            // Second Row: Messages and Events
            HStack(spacing: 12) {
                StatCard(
                    title: "Messages",
                    value: "\(stats.unreadMessages)",
                    icon: "envelope.fill",
                    color: Color(red: 0.8, green: 0.9, blue: 1.0),
                    textColor: .primary,
                    onTap: { selectedTab = .chat }
                )
                
                StatCard(
                    title: "Events",
                    value: "\(stats.upcomingEvents)",
                    subtitle: "Upcoming",
                    icon: "calendar",
                    color: Color(red: 1.0, green: 0.9, blue: 0.9),
                    textColor: .primary,
                    onTap: { selectedTab = .calendar }
                )
            }
        }
        .padding(.horizontal, 20)
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    let icon: String
    let color: Color
    let textColor: Color
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: icon)
                    .font(.system(size: 36))
                    .foregroundColor(textColor)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(value)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(textColor)
                    
                    Text(title)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(textColor.opacity(0.9))
                    
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(textColor.opacity(0.7))
                    }
                }
            }
            .frame(height: 140)
            .frame(maxWidth: .infinity)
            .padding(16)
            .background(color)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Quick Actions Row
struct QuickActionsRow: View {
    @Binding var selectedTab: TabItem
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                QuickActionCard(
                    title: "My Tasks",
                    icon: "list.bullet",
                    color: .blue,
                    onTap: { selectedTab = .tasks }
                )
                
                QuickActionCard(
                    title: "Messages",
                    icon: "envelope.fill",
                    color: .purple,
                    onTap: { selectedTab = .chat }
                )
                
                QuickActionCard(
                    title: "Calendar",
                    icon: "calendar",
                    color: .orange,
                    onTap: { selectedTab = .calendar }
                )
            }
            .padding(.horizontal, 20)
        }
    }
}

// MARK: - Quick Action Card
struct QuickActionCard: View {
    let title: String
    let icon: String
    let color: Color
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(.white)
                
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }
            .frame(width: 100, height: 100)
            .background(color)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}


// MARK: - Compact Blog Post Item
struct CompactBlogPostItem: View {
    let post: BlogPost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let title = post.title {
                Text(title)
                    .font(.headline)
                    .lineLimit(1)
            }
            
            if let text = post.text {
                Text(text)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(12)
        .frame(width: 200)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    DashboardView(selectedTab: .constant(.dashboard))
}
