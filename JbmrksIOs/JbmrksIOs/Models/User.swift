//
//  User.swift
//  JbmrksIOs
//
//  User profile model
//

import Foundation

struct User: Codable {
    let id: String
    let name: String
    let lastName: String
    let email: String?
    let photoUrl: String?
    let position: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case name = "NAME"
        case lastName = "LAST_NAME"
        case email = "EMAIL"
        case photoUrl = "PERSONAL_PHOTO"
        case position = "WORK_POSITION"
    }
    
    var fullName: String {
        "\(name) \(lastName)"
    }
}

struct UserResponse: Codable {
    let result: User
}

// MARK: - Workgroup Model
struct Workgroup: Codable {
    let id: String
    let name: String
    let role: String?
    let imageUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "GROUP_ID"
        case name = "GROUP_NAME"
        case role = "ROLE"
        case imageUrl = "GROUP_IMAGE"
    }
}

struct WorkgroupsResponse: Codable {
    let result: [Workgroup]
}
