//
//  BlogPost.swift
//  JbmrksIOs
//
//  Blog post model for activity feed
//

import Foundation

struct BlogPost: Identifiable, Codable {
    let id: String
    let title: String?
    let text: String?
    let authorId: String?
    let date: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case title = "TITLE"
        case text = "DETAIL_TEXT"
        case authorId = "AUTHOR_ID"
        case date = "POST_DATE"
    }
    
    init(id: String, title: String?, text: String?, authorId: String?, date: String?) {
        self.id = id
        self.title = title
        self.text = text
        self.authorId = authorId
        self.date = date
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        text = try container.decodeIfPresent(String.self, forKey: .text)
        authorId = try container.decodeIfPresent(String.self, forKey: .authorId)
        date = try container.decodeIfPresent(String.self, forKey: .date)
    }
}

struct BlogFeedResponse: Codable {
    // Match Android: result is a list directly (not optional in Android, but we keep optional for safety)
    let result: [BlogPostDto]?
    let error: String?
    let error_description: String?
    
    // Handle case where result might be empty array or null
    var posts: [BlogPostDto] {
        return result ?? []
    }
}

struct BlogPostDto: Codable {
    let id: String?
    let title: String?
    let text: String?
    let authorId: String?
    let date: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case title = "TITLE"
        case text = "DETAIL_TEXT"
        case authorId = "AUTHOR_ID"
        case date = "POST_DATE"
    }
    
    func toDomain() -> BlogPost {
        BlogPost(
            id: id ?? "",
            title: title,
            text: text,
            authorId: authorId,
            date: date
        )
    }
}

struct AddBlogPostRequest: Codable {
    let title: String?
    let message: String
    let destinations: [String]?
    let files: [String]?
}

struct AddBlogPostResponse: Codable {
    let result: String?
}
