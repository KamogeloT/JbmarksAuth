//
//  CalendarEvent.swift
//  JbmrksIOs
//
//  Calendar event model
//

import Foundation

struct CalendarEvent: Identifiable, Codable {
    let id: String
    let name: String?
    let description: String?
    let fromDate: String?
    let toDate: String?
    let location: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case name = "NAME"
        case description = "DESCRIPTION"
        case fromDate = "DATE_FROM"
        case toDate = "DATE_TO"
        case location = "LOCATION"
    }
    
    // Custom initializer for decoding from JSON
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        fromDate = try container.decodeIfPresent(String.self, forKey: .fromDate)
        toDate = try container.decodeIfPresent(String.self, forKey: .toDate)
        location = try container.decodeIfPresent(String.self, forKey: .location)
    }
    
    // Regular initializer for direct creation
    init(id: String, name: String?, description: String?, fromDate: String?, toDate: String?, location: String?) {
        self.id = id
        self.name = name
        self.description = description
        self.fromDate = fromDate
        self.toDate = toDate
        self.location = location
    }
}

struct CalendarEventsRequest: Codable {
    // Match Android: all fields are optional
    let filter: CalendarEventFilter?
    let ownerId: String?
    let type: String?
}

struct CalendarEventFilter: Codable {
    // Match Android: use >FROM and <FROM for date range (optional fields like Android)
    let fromDate: String?
    let toDate: String?
    
    enum CodingKeys: String, CodingKey {
        case fromDate = ">FROM"
        case toDate = "<FROM"
    }
    
    // Custom encoding to match Android format
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let fromDate = fromDate {
            try container.encode(fromDate, forKey: .fromDate)
        }
        if let toDate = toDate {
            try container.encode(toDate, forKey: .toDate)
        }
    }
}

struct CalendarEventsResponse: Codable {
    let result: [CalendarEventDto]?
}

struct CalendarEventDto: Codable {
    // Match Android: all fields are nullable
    let id: String?
    let name: String?
    let description: String?
    let fromDate: String?
    let toDate: String?
    let location: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case name = "NAME"
        case description = "DESCRIPTION"
        case fromDate = "DATE_FROM"
        case toDate = "DATE_TO"
        case location = "LOCATION"
    }
    
    // Custom decoder to handle missing fields gracefully
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        fromDate = try container.decodeIfPresent(String.self, forKey: .fromDate)
        toDate = try container.decodeIfPresent(String.self, forKey: .toDate)
        location = try container.decodeIfPresent(String.self, forKey: .location)
    }
    
    func toDomain() -> CalendarEvent {
        // Match Android mapper: provide defaults for required fields
        CalendarEvent(
            id: id ?? "0",
            name: name ?? "No Title",
            description: description,
            fromDate: fromDate ?? "",
            toDate: toDate ?? "",
            location: location
        )
    }
}
