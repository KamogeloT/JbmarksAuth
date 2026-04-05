//
//  CalendarView.swift
//  JbmrksIOs
//
//  Calendar screen with calendar grid and filtered events
//

import SwiftUI

struct CalendarView: View {
    @StateObject private var viewModel = CalendarViewModel()
    
    var body: some View {
        ZStack {
            if viewModel.isLoading && viewModel.allEvents.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadCalendarEvents()
                    }
                }
            } else {
                VStack(spacing: 0) {
                    // Calendar Grid
                    CalendarGridView(viewModel: viewModel)
                        .padding(.top, 8)
                        .padding(.bottom, 4)
                    
                    Divider()
                        .padding(.vertical, 4)
                    
                    // Events List for Selected Date
                    if let selectedDate = viewModel.selectedDate {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(selectedDateFormatted(selectedDate))
                                    .font(.headline)
                                    .padding(.horizontal, 16)
                                    .padding(.top, 8)
                                
                                Spacer()
                                
                                Button(action: {
                                    viewModel.clearSelection()
                                }) {
                                    Text("Clear")
                                        .font(.subheadline)
                                        .foregroundColor(.blue)
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 8)
                            }
                            
                            if viewModel.filteredEvents.isEmpty {
                                VStack(spacing: 12) {
                                    Text("No events on this day")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                        .padding(.top, 20)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                            } else {
                                ScrollView {
                                    LazyVStack(spacing: 12) {
                                        ForEach(viewModel.filteredEvents) { event in
                                            EventItemView(event: event)
                                        }
                                    }
                                    .padding()
                                }
                            }
                        }
                    } else {
                        // No date selected - show message
                        VStack(spacing: 16) {
                            Text("📅")
                                .font(.system(size: 64))
                            
                            Text("Select a date to view events")
                                .font(.title3)
                                .fontWeight(.semibold)
                            
                            Text("Tap on any day in the calendar above\nto see events for that day")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding()
                    }
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
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshCalendar"))) { _ in
            _Concurrency.Task { @MainActor in
                await viewModel.loadCalendarEvents()
            }
        }
    }
    
    private func selectedDateFormatted(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: date)
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
