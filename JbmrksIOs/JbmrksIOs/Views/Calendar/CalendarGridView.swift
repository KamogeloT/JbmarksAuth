//
//  CalendarGridView.swift
//  JbmrksIOs
//
//  Calendar grid component with month/year navigation
//

import SwiftUI

struct CalendarGridView: View {
    @ObservedObject var viewModel: CalendarViewModel
    @State private var selectedDay: Date?
    
    private let calendar = Calendar.current
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter
    }()
    
    var body: some View {
        VStack(spacing: 0) {
            // Month/Year Header with Navigation
            HStack {
                Button(action: {
                    viewModel.goToPreviousMonth()
                }) {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                Text(dateFormatter.string(from: viewModel.currentMonth))
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button(action: {
                    viewModel.goToNextMonth()
                }) {
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .foregroundColor(.blue)
                }
                
                // Add Today button in header for quick access
                Button(action: {
                    viewModel.goToToday()
                }) {
                    Text("Today")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(6)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            
            // Day of week headers
            HStack(spacing: 0) {
                ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 8)
            
            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                ForEach(daysInMonth, id: \.self) { date in
                    if let date = date {
                        CalendarDayView(
                            date: date,
                            isSelected: isSelected(date),
                            isToday: calendar.isDateInToday(date),
                            hasEvents: viewModel.hasEventsOnDate(date),
                            isCurrentMonth: calendar.isDate(date, equalTo: viewModel.currentMonth, toGranularity: .month)
                        )
                        .onTapGesture {
                            selectedDay = date
                            viewModel.selectDate(date)
                        }
                    } else {
                        Color.clear
                            .frame(height: 44)
                    }
                }
            }
            .padding(.horizontal)
        }
        .background(Color(.systemBackground))
    }
    
    private var daysInMonth: [Date?] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: viewModel.currentMonth) else {
            return []
        }
        
        let firstDayOfMonth = monthInterval.start
        guard let lastDayOfMonth = calendar.date(byAdding: .day, value: -1, to: monthInterval.end) else {
            return []
        }
        
        // Get the weekday of the first day (0 = Sunday, 6 = Saturday)
        let firstWeekday = calendar.component(.weekday, from: firstDayOfMonth) - 1
        
        // Get the number of days in the month
        let daysInMonth = calendar.dateComponents([.day], from: firstDayOfMonth, to: lastDayOfMonth).day ?? 0
        
        var days: [Date?] = []
        
        // Add empty cells for days before the first day of the month
        for _ in 0..<firstWeekday {
            days.append(nil)
        }
        
        // Add all days in the month
        for dayOffset in 0...daysInMonth {
            if let date = calendar.date(byAdding: .day, value: dayOffset, to: firstDayOfMonth) {
                days.append(date)
            }
        }
        
        // Fill remaining cells to complete the grid (6 rows x 7 columns = 42 cells)
        while days.count < 42 {
            days.append(nil)
        }
        
        return days
    }
    
    private func isSelected(_ date: Date) -> Bool {
        guard let selectedDate = viewModel.selectedDate else { return false }
        return calendar.isDate(date, inSameDayAs: selectedDate)
    }
}

// MARK: - Calendar Day View
struct CalendarDayView: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let hasEvents: Bool
    let isCurrentMonth: Bool
    
    private let calendar = Calendar.current
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(calendar.component(.day, from: date))")
                .font(.system(size: 16, weight: isSelected ? .bold : .regular))
                .foregroundColor(dayTextColor)
            
            if hasEvents {
                Circle()
                    .fill(eventIndicatorColor)
                    .frame(width: 6, height: 6)
            } else {
                Spacer()
                    .frame(height: 6)
            }
        }
        .frame(height: 44)
        .frame(maxWidth: .infinity)
        .background(backgroundColor)
        .cornerRadius(8)
    }
    
    private var dayTextColor: Color {
        if !isCurrentMonth {
            return .secondary.opacity(0.5)
        } else if isSelected {
            return .white
        } else if isToday {
            return .blue
        } else {
            return .primary
        }
    }
    
    private var backgroundColor: Color {
        if isSelected {
            return .blue
        } else if isToday {
            return .blue.opacity(0.1)
        } else {
            return Color.clear
        }
    }
    
    private var eventIndicatorColor: Color {
        if isSelected {
            return .white
        } else {
            return .blue
        }
    }
}
