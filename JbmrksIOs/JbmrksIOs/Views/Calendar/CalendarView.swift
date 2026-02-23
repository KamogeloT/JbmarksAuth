//
//  CalendarView.swift
//  JbmrksIOs
//
//  Calendar screen
//

import SwiftUI

struct CalendarView: View {
    @StateObject private var viewModel = CalendarViewModel()
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadCalendarEvents()
                    }
                }
            } else if viewModel.events.isEmpty {
                EmptyCalendarState()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.events) { event in
                            EventItemView(event: event)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Calendar")
        .task {
            await viewModel.loadCalendarEvents()
        }
        .refreshable {
            await viewModel.loadCalendarEvents()
        }
    }
}

// MARK: - Event Item View
struct EventItemView: View {
    let event: CalendarEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let name = event.name {
                Text(name)
                    .font(.headline)
            }
            
            if let description = event.description {
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                if let fromDate = event.fromDate {
                    Label(fromDate, systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let location = event.location {
                    Label(location, systemImage: "location")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Empty Calendar State
struct EmptyCalendarState: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("📅")
                .font(.system(size: 64))
            
            Text("No Events Scheduled")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("When you have calendar events,\nthey will appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
