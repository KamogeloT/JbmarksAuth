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
    let authorName: String?
    let commentCount: Int?
    let files: [BlogPostFile]?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case title = "TITLE"
        case text = "DETAIL_TEXT"
        case authorId = "AUTHOR_ID"
        case date = "POST_DATE"
        case authorName = "AUTHOR_NAME"
        case commentCount = "COMMENTS_COUNT"
        case files = "FILES"
    }
    
    init(id: String, title: String?, text: String?, authorId: String?, date: String?, authorName: String? = nil, commentCount: Int? = nil, files: [BlogPostFile]? = nil) {
        self.id = id
        self.title = title
        self.text = text
        self.authorId = authorId
        self.date = date
        self.authorName = authorName
        self.commentCount = commentCount
        self.files = files
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        text = try container.decodeIfPresent(String.self, forKey: .text)
        authorId = try container.decodeIfPresent(String.self, forKey: .authorId)
        date = try container.decodeIfPresent(String.self, forKey: .date)
        authorName = try container.decodeIfPresent(String.self, forKey: .authorName)
        commentCount = try container.decodeIfPresent(Int.self, forKey: .commentCount)
        files = try container.decodeIfPresent([BlogPostFile].self, forKey: .files)
    }
}

struct BlogPostFile: Codable {
    let id: String?
    let name: String?
    let url: String?
    let previewUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case name = "NAME"
        case url = "DOWNLOAD_URL"
        case previewUrl = "PREVIEW_URL"
    }
}

struct BlogComment: Identifiable, Codable {
    let id: String
    let postId: String
    let text: String?
    let authorId: String?
    let authorName: String?
    let date: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case postId = "POST_ID"
        case text = "POST_TEXT"
        case authorId = "AUTHOR_ID"
        case authorName = "AUTHOR_NAME"
        case date = "POST_DATE"
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
    let authorName: String?
    let commentCount: Int?
    let files: [BlogPostFile]?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case title = "TITLE"
        case text = "DETAIL_TEXT"
        case authorId = "AUTHOR_ID"
        case date = "POST_DATE"
        case authorName = "AUTHOR_NAME"
        case commentCount = "COMMENTS_COUNT"
        case files = "FILES"
    }
    
    func toDomain() -> BlogPost {
        BlogPost(
            id: id ?? "",
            title: title,
            text: text,
            authorId: authorId,
            date: date,
            authorName: authorName,
            commentCount: commentCount,
            files: files
        )
    }
}

struct BlogCommentsResponse: Codable {
    let result: [BlogCommentDto]?
    let error: String?
    let error_description: String?
}

struct BlogCommentDto: Codable {
    let id: String?
    let postId: String?
    let text: String?
    let authorId: String?
    let authorName: String?
    let date: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case postId = "POST_ID"
        case text = "POST_TEXT"
        case authorId = "AUTHOR_ID"
        case authorName = "AUTHOR_NAME"
        case date = "POST_DATE"
    }
    
    func toDomain() -> BlogComment {
        BlogComment(
            id: id ?? "",
            postId: postId ?? "",
            text: text,
            authorId: authorId,
            authorName: authorName,
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
