//
//  BitrixApiClient.swift
//  JbmrksIOs
//
//  Native Swift Bitrix24 API client (temporary)
//

import Foundation

struct BitrixApiClient {
    let baseUrl: String
    let accessToken: String
    
    private var apiUrl: String {
        let url = baseUrl.hasSuffix("/") ? baseUrl : "\(baseUrl)/"
        return "\(url)rest/"
    }
    
    func getTasks(
        responsibleId: String? = nil,
        createdBy: String? = nil,
        status: String? = nil,
        groupId: String? = nil
    ) async throws -> TasksResponse {
        var components = URLComponents(string: "\(apiUrl)tasks.task.list.json")!
        var queryItems = [URLQueryItem(name: "auth", value: accessToken)]
        
        if let responsibleId = responsibleId {
            queryItems.append(URLQueryItem(name: "filter[RESPONSIBLE_ID]", value: responsibleId))
        }
        if let createdBy = createdBy {
            queryItems.append(URLQueryItem(name: "filter[CREATED_BY]", value: createdBy))
        }
        if let status = status {
            queryItems.append(URLQueryItem(name: "filter[STATUS]", value: status))
        }
        if let groupId = groupId {
            queryItems.append(URLQueryItem(name: "filter[GROUP_ID]", value: groupId))
        }
        
        components.queryItems = queryItems
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError(NSError(domain: "BitrixApiClient", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8)
            throw APIError.httpError(httpResponse.statusCode, errorMessage)
        }
        
        // Check for Bitrix24 error in response
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        let tasksResponse = try JSONDecoder().decode(TasksResponse.self, from: data)
        return tasksResponse
    }
    
    func getTask(id: String) async throws -> TaskResponse {
        var components = URLComponents(string: "\(apiUrl)tasks.task.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "taskId", value: id)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
    
    func completeTask(id: String) async throws -> TaskResponse {
        return try await performTaskAction(endpoint: "tasks.task.complete.json", taskId: id)
    }
    
    func startTask(id: String) async throws -> TaskResponse {
        return try await performTaskAction(endpoint: "tasks.task.start.json", taskId: id)
    }
    
    func deferTask(id: String) async throws -> TaskResponse {
        return try await performTaskAction(endpoint: "tasks.task.defer.json", taskId: id)
    }
    
    func renewTask(id: String) async throws -> TaskResponse {
        return try await performTaskAction(endpoint: "tasks.task.renew.json", taskId: id)
    }
    
    func deleteTask(id: String) async throws {
        var components = URLComponents(string: "\(apiUrl)tasks.task.delete.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "taskId", value: id)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
    }
    
    func updateTask(
        id: String,
        title: String?,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> TaskResponse {
        var components = URLComponents(string: "\(apiUrl)tasks.task.update.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "taskId", value: id)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        var bodyComponents = URLComponents()
        var queryItems: [URLQueryItem] = []
        
        if let title = title {
            queryItems.append(URLQueryItem(name: "fields[TITLE]", value: title))
        }
        if let description = description {
            queryItems.append(URLQueryItem(name: "fields[DESCRIPTION]", value: description))
        }
        if let deadline = deadline {
            queryItems.append(URLQueryItem(name: "fields[DEADLINE]", value: deadline))
        }
        if let priority = priority {
            queryItems.append(URLQueryItem(name: "fields[PRIORITY]", value: priority.rawValue))
        }
        
        bodyComponents.queryItems = queryItems
        request.httpBody = bodyComponents.query?.data(using: .utf8)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
    
    private func performTaskAction(endpoint: String, taskId: String) async throws -> TaskResponse {
        var components = URLComponents(string: "\(apiUrl)\(endpoint)")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "taskId", value: taskId)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        return try JSONDecoder().decode(TaskResponse.self, from: data)
    }
    
    func getCurrentUser() async throws -> User {
        var components = URLComponents(string: "\(apiUrl)user.current.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        let userResponse = try JSONDecoder().decode(UserResponse.self, from: data)
        return userResponse.result
    }
    
    func getUser(id: String) async throws -> User {
        var components = URLComponents(string: "\(apiUrl)user.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "ID", value: id)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        // Bitrix24 returns array for user.get
        struct UsersResponse: Codable {
            let result: [User]
        }
        
        let usersResponse = try JSONDecoder().decode(UsersResponse.self, from: data)
        guard let user = usersResponse.result.first else {
            throw APIError.noData
        }
        return user
    }
    
    func getCalendarEvents() async throws -> [CalendarEvent] {
        // Get current date and date 1 year from now
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let today = Date()
        let oneYearFromNow = Calendar.current.date(byAdding: .year, value: 1, to: today) ?? today
        
        let fromDate = dateFormatter.string(from: today)
        let toDate = dateFormatter.string(from: oneYearFromNow)
        
        let request = CalendarEventsRequest(
            filter: CalendarEventFilter(fromDate: fromDate, toDate: toDate),
            ownerId: nil,
            type: "user"
        )
        
        var components = URLComponents(string: "\(apiUrl)calendar.event.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        let eventsResponse = try JSONDecoder().decode(CalendarEventsResponse.self, from: data)
        return eventsResponse.result?.map { $0.toDomain() } ?? []
    }
    
    func getBlogFeed() async throws -> [BlogPost] {
        var components = URLComponents(string: "\(apiUrl)log.blogpost.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        let feedResponse = try JSONDecoder().decode(BlogFeedResponse.self, from: data)
        return feedResponse.result.map { $0.toDomain() }
    }
    
    func addBlogPost(message: String, title: String?) async throws -> String {
        var components = URLComponents(string: "\(apiUrl)log.blogpost.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = AddBlogPostRequest(
            title: title,
            message: message,
            destinations: nil,
            files: nil
        )
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        let addResponse = try JSONDecoder().decode(AddBlogPostResponse.self, from: data)
        return addResponse.result ?? ""
    }
    
    func getRecentChats() async throws -> [Chat] {
        var components = URLComponents(string: "\(apiUrl)im.recent.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            print("❌ Chat API: Invalid URL")
            throw APIError.invalidURL
        }
        
        print("📡 Chat API: Fetching recent chats from \(url.absoluteString)")
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Chat API: Invalid response type")
            throw APIError.networkError(NSError(domain: "BitrixApiClient", code: -1))
        }
        
        print("📡 Chat API: Response status: \(httpResponse.statusCode)")
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unable to decode error"
            print("❌ Chat API: HTTP error \(httpResponse.statusCode): \(errorBody)")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 error in response
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Chat API: Bitrix error: \(error)")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        struct ChatRecentResponse: Codable {
            let result: [ChatConversationDto]?
        }
        
        do {
            let chatResponse = try JSONDecoder().decode(ChatRecentResponse.self, from: data)
            let chats = chatResponse.result?.map { $0.toDomain() } ?? []
            print("✅ Chat API: Successfully loaded \(chats.count) chats")
            return chats
        } catch {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unable to decode"
            print("❌ Chat API: Decoding error: \(error). Response: \(errorBody)")
            throw APIError.decodingError
        }
    }
    
    func getChatMessages(dialogId: String, limit: Int = 50) async throws -> [Message] {
        var components = URLComponents(string: "\(apiUrl)im.dialog.messages.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "DIALOG_ID", value: dialogId),
            URLQueryItem(name: "LIMIT", value: "\(limit)")
        ]
        
        guard let url = components.url else {
            print("❌ Messages API: Invalid URL")
            throw APIError.invalidURL
        }
        
        print("📡 Messages API: Fetching messages for dialogId: \(dialogId)")
        print("📡 Messages API: URL: \(url.absoluteString)")
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Messages API: Invalid response type")
            throw APIError.networkError(NSError(domain: "BitrixApiClient", code: -1))
        }
        
        print("📡 Messages API: Response status: \(httpResponse.statusCode)")
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unable to decode error"
            print("❌ Messages API: HTTP error \(httpResponse.statusCode): \(errorBody)")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 error in response
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Messages API: Bitrix error: \(error)")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        struct ChatMessagesResponse: Codable {
            let result: MessagesResult?
        }
        
        struct MessagesResult: Codable {
            let messages: [MessageDto]?
        }
        
        do {
            let messagesResponse = try JSONDecoder().decode(ChatMessagesResponse.self, from: data)
            let messageDtos = messagesResponse.result?.messages ?? []
            print("📡 Messages API: Decoded \(messageDtos.count) messages")
            
            // Fetch user names for all senders
            let senderIds = Set(messageDtos.compactMap { $0.authorId })
            var userMap: [String: String] = [:]
            
            print("📡 Messages API: Fetching user info for \(senderIds.count) senders")
            for senderId in senderIds {
                do {
                    let user = try await getUser(id: senderId)
                    userMap[senderId] = user.fullName
                } catch {
                    print("⚠️ Messages API: Failed to fetch user \(senderId): \(error)")
                }
            }
            
            let messages = messageDtos.map { dto in
                dto.toDomain(dialogId: dialogId, senderName: userMap[dto.authorId ?? ""] ?? "")
            }
            print("✅ Messages API: Successfully loaded \(messages.count) messages")
            return messages
        } catch {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unable to decode"
            print("❌ Messages API: Decoding error: \(error). Response: \(String(errorBody.prefix(500)))")
            throw APIError.decodingError
        }
    }
    
    func sendMessage(dialogId: String, text: String, fileIds: [String]? = nil) async throws -> String {
        var components = URLComponents(string: "\(apiUrl)im.message.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        struct SendMessageRequest: Codable {
            let dialogId: String
            let message: String
            let system: String
            let files: [String]?
            
            enum CodingKeys: String, CodingKey {
                case dialogId = "DIALOG_ID"
                case message = "MESSAGE"
                case system = "SYSTEM"
                case files = "FILES"
            }
        }
        
        let body = SendMessageRequest(
            dialogId: dialogId,
            message: text,
            system: "N",
            files: fileIds
        )
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        // Bitrix24 can return message ID as number or object
        struct SendMessageResponse: Codable {
            let result: SendMessageResultValue?
        }
        
        enum SendMessageResultValue: Codable {
            case string(String)
            case int(Int)
            case object([String: String])
            
            init(from decoder: Decoder) throws {
                let container = try decoder.singleValueContainer()
                if let intValue = try? container.decode(Int.self) {
                    self = .int(intValue)
                } else if let stringValue = try? container.decode(String.self) {
                    self = .string(stringValue)
                } else if let objectValue = try? container.decode([String: String].self) {
                    self = .object(objectValue)
                } else {
                    throw DecodingError.typeMismatch(SendMessageResultValue.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Cannot decode SendMessageResultValue"))
                }
            }
            
            var messageId: String {
                switch self {
                case .string(let str): return str
                case .int(let int): return "\(int)"
                case .object(let obj): return obj["MESSAGE_ID"] ?? obj["messageId"] ?? ""
                }
            }
        }
        
        let sendResponse = try JSONDecoder().decode(SendMessageResponse.self, from: data)
        return sendResponse.result?.messageId ?? ""
    }
    
    func createChat(userIds: [String], title: String?) async throws -> Chat {
        var components = URLComponents(string: "\(apiUrl)im.chat.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        struct CreateChatRequest: Codable {
            let users: [String]
            let title: String?
            
            enum CodingKeys: String, CodingKey {
                case users = "USERS"
                case title = "TITLE"
            }
        }
        
        let body = CreateChatRequest(users: userIds, title: title)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        struct CreateChatResponse: Codable {
            let result: ChatConversationDto?
        }
        
        let createResponse = try JSONDecoder().decode(CreateChatResponse.self, from: data)
        guard let chatDto = createResponse.result else {
            throw APIError.noData
        }
        return chatDto.toDomain()
    }
    
    func getTaskComments(taskId: String) async throws -> [CommentDto] {
        var components = URLComponents(string: "\(apiUrl)task.commentitem.getlist.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["TASK_ID": taskId]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        struct CommentsListResponse: Codable {
            let result: [CommentDto]?
        }
        
        let commentsResponse = try JSONDecoder().decode(CommentsListResponse.self, from: data)
        return commentsResponse.result ?? []
    }
    
    func addTaskComment(taskId: String, text: String, fileIds: [String]? = nil) async throws -> String {
        var components = URLComponents(string: "\(apiUrl)task.commentitem.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let taskIdInt = Int(taskId) else {
            throw APIError.invalidURL
        }
        
        struct AddCommentRequest: Codable {
            let arFields: [CommentFields]
        }
        
        struct CommentFields: Codable {
            let taskId: Int
            let text: String
            let files: [String]?
            
            enum CodingKeys: String, CodingKey {
                case taskId = "TASK_ID"
                case text = "POST_MESSAGE"
                case files = "FILES"
            }
        }
        
        let body = AddCommentRequest(
            arFields: [
                CommentFields(
                    taskId: taskIdInt,
                    text: text,
                    files: fileIds
                )
            ]
        )
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        struct CommentResponse: Codable {
            let result: CommentResult?
        }
        
        struct CommentResult: Codable {
            let id: String?
            
            enum CodingKeys: String, CodingKey {
                case id = "ID"
            }
        }
        
        let commentResponse = try JSONDecoder().decode(CommentResponse.self, from: data)
        return commentResponse.result?.id ?? ""
    }
    
    func getTaskFiles(taskId: String) async throws -> [TaskFileDto] {
        var components = URLComponents(string: "\(apiUrl)disk.attachedObject.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "ENTITY_TYPE_ID", value: "1"), // Task entity
            URLQueryItem(name: "ENTITY_ID", value: taskId)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        struct AttachedObjectResponse: Codable {
            let result: [TaskFileDto]?
        }
        
        let filesResponse = try JSONDecoder().decode(AttachedObjectResponse.self, from: data)
        return filesResponse.result ?? []
    }
    
    func uploadFile(fileData: Data, fileName: String) async throws -> String {
        // Base64 encode file
        let base64Data = fileData.base64EncodedString()
        
        var components = URLComponents(string: "\(apiUrl)disk.storage.uploadfile.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        struct FileUploadRequest: Codable {
            let id: Int
            let data: FileData
            let fileContent: String
            
            enum CodingKeys: String, CodingKey {
                case id
                case data
                case fileContent
            }
        }
        
        struct FileData: Codable {
            let name: String
            
            enum CodingKeys: String, CodingKey {
                case name = "NAME"
            }
        }
        
        let body = FileUploadRequest(
            id: 1, // Root folder
            data: FileData(name: fileName),
            fileContent: base64Data
        )
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        struct FileUploadResponse: Codable {
            let result: FileUploadResult?
        }
        
        struct FileUploadResult: Codable {
            let id: String?
            
            enum CodingKeys: String, CodingKey {
                case id = "ID"
            }
        }
        
        let uploadResponse = try JSONDecoder().decode(FileUploadResponse.self, from: data)
        guard let fileId = uploadResponse.result?.id else {
            throw APIError.noData
        }
        return fileId
    }
    
    func attachFileToTask(taskId: String, fileId: String) async throws {
        var components = URLComponents(string: "\(apiUrl)tasks.task.files.attach.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        struct AttachFileRequest: Codable {
            let taskId: String
            let fileId: String
        }
        
        let body = AttachFileRequest(taskId: taskId, fileId: fileId)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
    }
}

// MARK: - Comment DTOs
struct CommentDto: Codable {
    let id: String?
    let idUpper: String?
    let taskId: String?
    let authorId: String?
    let authorIdUpper: String?
    let text: String?
    let textUpper: String?
    let createdDate: String?
    let postDate: String?
    let postDateUpper: String?
    let author: CommentAuthorDto?
    let authorUpper: CommentAuthorDto?
    let files: [CommentFileDto]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case idUpper = "ID"
        case taskId
        case authorId
        case authorIdUpper = "AUTHOR_ID"
        case text = "postMessage"
        case textUpper = "POST_MESSAGE"
        case createdDate
        case postDate
        case postDateUpper = "POST_DATE"
        case author
        case authorUpper = "AUTHOR"
        case files
    }
    
    func toDomain(authorName: String?) -> Comment {
        let commentFiles = (files ?? []).map { dto in
            CommentFile(
                id: dto.id ?? "",
                name: dto.name ?? "Unknown",
                size: Int64(dto.size ?? "0") ?? 0,
                type: dto.type ?? "application/octet-stream",
                downloadUrl: dto.downloadUrl ?? dto.url
            )
        }
        
        return Comment(
            id: id ?? idUpper ?? "",
            text: text ?? textUpper ?? "",
            authorName: authorName ?? author?.getAuthorDisplayName() ?? authorUpper?.getAuthorDisplayName(),
            createdDate: createdDate ?? postDate ?? postDateUpper,
            files: commentFiles
        )
    }
}

struct CommentFileDto: Codable {
    let id: String?
    let name: String?
    let size: String?
    let type: String?
    let downloadUrl: String?
    let url: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case size
        case type
        case downloadUrl
        case url
    }
}

struct CommentAuthorDto: Codable {
    let authorId: String?
    let authorIdUpper: String?
    let authorFirstName: String?
    let authorFirstNameUpper: String?
    let authorLastName: String?
    let authorLastNameUpper: String?
    let authorFullName: String?
    let authorFullNameUpper: String?
    
    enum CodingKeys: String, CodingKey {
        case authorId = "id"
        case authorIdUpper = "ID"
        case authorFirstName = "name"
        case authorFirstNameUpper = "NAME"
        case authorLastName = "lastName"
        case authorLastNameUpper = "LAST_NAME"
        case authorFullName = "fullName"
        case authorFullNameUpper = "FULL_NAME"
    }
    
    func getAuthorDisplayName() -> String? {
        return authorFullName ?? authorFullNameUpper ?? {
            let first = authorFirstName ?? authorFirstNameUpper ?? ""
            let last = authorLastName ?? authorLastNameUpper ?? ""
            if !first.isEmpty || !last.isEmpty {
                return "\(first) \(last)".trimmingCharacters(in: .whitespaces)
            }
            return nil
        }()
    }
}

// MARK: - Task File DTO
struct TaskFileDto: Codable {
    let id: String?
    let name: String?
    let size: String?
    let type: String?
    let downloadUrl: String?
    let url: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "ID"
        case name = "NAME"
        case size = "SIZE"
        case type = "TYPE"
        case downloadUrl = "DOWNLOAD_URL"
        case url = "URL"
    }
    
    func toDomain() -> TaskFile {
        TaskFile(
            id: id ?? "",
            name: name ?? "",
            size: Int64(size ?? "0") ?? 0,
            downloadUrl: downloadUrl ?? url,
            type: type
        )
    }
}


// MARK: - Chat DTOs
struct ChatConversationDto: Codable {
    let id: String?
    let title: String?
    let message: ChatMessageDto?
    let counter: Int?
    let type: String?
    let avatar: ChatAvatarValue?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case message
        case counter
        case type
        case avatar
    }
    
    // Custom decoder to handle id being either String or Int
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle id as either String or Int
        if let idString = try? container.decode(String.self, forKey: .id) {
            id = idString
        } else if let idInt = try? container.decode(Int.self, forKey: .id) {
            id = "\(idInt)"
        } else {
            id = nil
        }
        
        title = try container.decodeIfPresent(String.self, forKey: .title)
        message = try container.decodeIfPresent(ChatMessageDto.self, forKey: .message)
        counter = try container.decodeIfPresent(Int.self, forKey: .counter)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        avatar = try container.decodeIfPresent(ChatAvatarValue.self, forKey: .avatar)
    }
    
    func toDomain() -> Chat {
        let chatType: ChatType
        switch type {
        case "PRIVATE": chatType = .privateChat
        case "GROUP": chatType = .group
        case "OPEN": chatType = .open
        default: chatType = .privateChat
        }
        
        let dateValue: Int64
        if let dateStr = message?.date {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: dateStr) {
                dateValue = Int64(date.timeIntervalSince1970 * 1000)
            } else {
                dateValue = 0
            }
        } else {
            dateValue = 0
        }
        
        let avatarUrl: String?
        if let avatar = avatar {
            avatarUrl = avatar.url
        } else {
            avatarUrl = nil
        }
        
        return Chat(
            id: id ?? "",
            dialogId: id ?? "",
            type: chatType,
            name: title ?? "",
            avatar: avatarUrl,
            lastMessage: message?.toDomain(dialogId: id ?? "", senderName: ""),
            unreadCount: counter ?? 0,
            isPinned: false,
            lastMessageDate: dateValue
        )
    }
}

struct ChatMessageDto: Codable {
    let id: Int?
    let text: String?
    let authorId: Int?
    let date: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case text
        case authorId = "author_id"
        case date
    }
    
    func toDomain(dialogId: String, senderName: String) -> Message {
        let timestamp: Int64
        if let dateStr = date {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: dateStr) {
                timestamp = Int64(date.timeIntervalSince1970 * 1000)
            } else {
                timestamp = Int64(Date().timeIntervalSince1970 * 1000)
            }
        } else {
            timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        }
        
        return Message(
            id: "\(id ?? 0)",
            chatId: dialogId,
            dialogId: dialogId,
            senderId: "\(authorId ?? 0)",
            senderName: senderName,
            text: text ?? "",
            timestamp: timestamp,
            isRead: true,
            isDelivered: true,
            files: [],
            replyTo: nil
        )
    }
}

enum ChatAvatarValue: Codable {
    case string(String)
    case object(AvatarObject)
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let objectValue = try? container.decode(AvatarObject.self) {
            self = .object(objectValue)
        } else {
            self = .string("")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let str):
            try container.encode(str)
        case .object(let obj):
            try container.encode(obj)
        }
    }
    
    var url: String? {
        switch self {
        case .string(let str): return str
        case .object(let obj): return obj.url
        }
    }
}

struct AvatarObject: Codable {
    let url: String?
}

struct MessageDto: Codable {
    let id: String?
    let authorId: String?
    let text: String?
    let date: String?
    let unread: String?
    let files: [MessageFileDto]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case authorId = "author_id"
        case text
        case date
        case unread
        case files
    }
    
    // Custom decoder to handle id being either String or Int
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle id as either String or Int
        if let idString = try? container.decode(String.self, forKey: .id) {
            id = idString
        } else if let idInt = try? container.decode(Int.self, forKey: .id) {
            id = "\(idInt)"
        } else {
            id = nil
        }
        
        // Handle authorId as either String or Int
        if let authorIdString = try? container.decode(String.self, forKey: .authorId) {
            authorId = authorIdString
        } else if let authorIdInt = try? container.decode(Int.self, forKey: .authorId) {
            authorId = "\(authorIdInt)"
        } else {
            authorId = nil
        }
        
        text = try container.decodeIfPresent(String.self, forKey: .text)
        date = try container.decodeIfPresent(String.self, forKey: .date)
        
        // Handle unread as either String or Bool
        if let unreadString = try? container.decode(String.self, forKey: .unread) {
            unread = unreadString
        } else if let unreadBool = try? container.decode(Bool.self, forKey: .unread) {
            unread = unreadBool ? "Y" : "N"
        } else {
            unread = nil
        }
        
        files = try container.decodeIfPresent([MessageFileDto].self, forKey: .files)
    }
    
    func toDomain(dialogId: String, senderName: String) -> Message {
        let timestamp: Int64
        if let dateStr = date {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: dateStr) {
                timestamp = Int64(date.timeIntervalSince1970 * 1000)
            } else {
                timestamp = Int64(Date().timeIntervalSince1970 * 1000)
            }
        } else {
            timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        }
        
        return Message(
            id: id ?? "",
            chatId: dialogId,
            dialogId: dialogId,
            senderId: authorId ?? "",
            senderName: senderName,
            text: text ?? "",
            timestamp: timestamp,
            isRead: unread == "N",
            isDelivered: true,
            files: files?.map { $0.toDomain() } ?? [],
            replyTo: nil
        )
    }
}

struct MessageFileDto: Codable {
    let id: String?
    let name: String?
    let size: String?
    let type: String?
    let downloadUrl: String?
    let previewUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case size
        case type
        case downloadUrl = "urlDownload"
        case previewUrl = "urlPreview"
    }
    
    func toDomain() -> MessageFile {
        MessageFile(
            id: id ?? "",
            name: name ?? "",
            size: Int64(size ?? "0") ?? 0,
            type: type ?? "",
            downloadUrl: downloadUrl,
            previewUrl: previewUrl
        )
    }
}

struct TaskResponse: Codable {
    let result: TaskResult?
}

struct TaskResult: Codable {
    let task: TaskDto?
    let tasks: [TaskDto]?
}

struct TasksResponse: Codable {
    let result: [String: [TaskDto]]?
}

struct TaskDto: Codable {
    let id: String?
    let title: String?
    let description: String?
    let status: String?
    let priority: String?
    let deadline: String?
    let createdDate: String?
    let closedDate: String?
    let createdBy: String?
    let responsibleId: String?
    let groupId: String?
    let tags: [String]?
    
    func toDomain() -> Task {
        Task(
            id: id ?? "",
            title: title ?? "",
            description: description ?? "",
            status: TaskStatus(rawValue: status ?? "2") ?? .new,
            priority: TaskPriority(rawValue: priority ?? "2") ?? .normal,
            deadline: deadline,
            createdDate: createdDate,
            closedDate: closedDate,
            createdBy: createdBy,
            createdByName: nil,
            responsibleId: responsibleId,
            responsibleName: nil,
            groupId: groupId,
            groupName: nil,
            commentsCount: 0,
            newCommentsCount: 0,
            tags: tags ?? []
        )
    }
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case networkError(Error)
    case httpError(Int, String?)
    case bitrixError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .httpError(let code, let message):
            return "HTTP \(code): \(message ?? "Unknown error")"
        case .bitrixError(let message):
            return "Bitrix24 error: \(message)"
        }
    }
}

struct BitrixErrorResponse: Codable {
    let error: String?
    let errorDescription: String?
    let errorMessage: String?
    
    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
        case errorMessage = "error_message"
    }
}
