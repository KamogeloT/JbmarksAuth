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
    
    // Configure URLSession with timeout for better error handling
    private static var configuredSession: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30.0 // 30 seconds
        configuration.timeoutIntervalForResource = 60.0 // 60 seconds
        return URLSession(configuration: configuration)
    }()
    
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
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
            // Removed select parameter - might cause issues with some Bitrix24 versions
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for getTask")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        // Log response for debugging
        if let responseString = String(data: data, encoding: .utf8) {
            print("📋 Task API response (first 500 chars): \(String(responseString.prefix(500)))")
        }
        
        // Handle non-200 responses
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Task API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors in response
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getTask: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        // Try to decode the task response
        do {
            return try JSONDecoder().decode(TaskResponse.self, from: data)
        } catch {
            print("⚠️ Failed to decode task response: \(error)")
            if let decodingError = error as? DecodingError {
                print("   Decoding error details: \(decodingError)")
            }
            // Log the actual response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("   Full response: \(responseString)")
            }
            throw APIError.decodingError
        }
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
        
        let (_, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
    }
    
    func createTask(
        title: String,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> TaskResponse {
        var components = URLComponents(string: "\(apiUrl)tasks.task.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        var bodyComponents = URLComponents()
        var queryItems: [URLQueryItem] = []
        
        // Title is required
        queryItems.append(URLQueryItem(name: "fields[TITLE]", value: title))
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError(NSError(domain: "BitrixApiClient", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Create task API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in createTask: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        return try JSONDecoder().decode(TaskResponse.self, from: data)
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
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
    
    func getUserWorkgroups() async throws -> [Workgroup] {
        var components = URLComponents(string: "\(apiUrl)sonet_group.user.groups.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for user workgroups")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ User workgroups API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getUserWorkgroups: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        do {
            let workgroupsResponse = try JSONDecoder().decode(WorkgroupsResponse.self, from: data)
            print("✅ Fetched \(workgroupsResponse.result.count) workgroups")
            return workgroupsResponse.result
        } catch {
            print("⚠️ Failed to decode workgroups: \(error)")
            if let decodingError = error as? DecodingError {
                print("   Decoding error details: \(decodingError)")
            }
            throw APIError.decodingError
        }
    }
    
    func getCalendarEvents(ownerId: String? = nil, type: String = "user") async throws -> [CalendarEvent] {
        // Support all calendar types: "user", "group", "company", or "" for all accessible
        // Match Android date format: "yyyy-MM-dd'T'HH:mm:ss" with UTC timezone
        // But extend range to include past events (1 year back) and future events (2 years forward)
        // This ensures we get all events, not just future ones
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        dateFormatter.timeZone = TimeZone(identifier: "UTC")
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        
        let today = Date()
        // Start from beginning of today to ensure we catch today's events
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: today)
        let oneYearAgo = calendar.date(byAdding: .year, value: -1, to: startOfToday) ?? startOfToday
        let twoYearsFromNow = calendar.date(byAdding: .year, value: 2, to: startOfToday) ?? startOfToday
        
        let fromDate = dateFormatter.string(from: oneYearAgo)
        let toDate = dateFormatter.string(from: twoYearsFromNow)
        
        print("📅 Fetching calendar events: from=\(fromDate), to=\(toDate), ownerId=\(ownerId ?? "nil"), type=\(type.isEmpty ? "all" : type)")
        print("   Today: \(dateFormatter.string(from: today))")
        
        // Match Android: create request with optional filter
        // Extended range to include past events
        // If type is empty string, don't include it (fetch all accessible events)
        let filter = CalendarEventFilter(fromDate: fromDate, toDate: toDate)
        let request = CalendarEventsRequest(
            filter: filter,
            ownerId: ownerId,
            type: type.isEmpty ? nil : type  // Empty string means fetch all, so set to nil
        )
        
        // Match Android: POST request with auth in query AND body
        var components = URLComponents(string: "\(apiUrl)calendar.event.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        // Create JSON encoder with custom settings to match Android
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .useDefaultKeys // Keep >FROM and <FROM as-is
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Encode request body
        do {
            urlRequest.httpBody = try encoder.encode(request)
            // Log request body for debugging
            if let bodyString = String(data: urlRequest.httpBody!, encoding: .utf8) {
                print("📅 Calendar request body: \(bodyString)")
            }
        } catch {
            print("❌ Failed to encode calendar request: \(error)")
            throw APIError.decodingError
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for calendar events")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        // Log response for debugging
        if let responseString = String(data: data, encoding: .utf8) {
            print("📅 Calendar API response (first 500 chars): \(String(responseString.prefix(500)))")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Calendar API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getCalendarEvents: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        do {
            // Log full response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("📅 Calendar API full response: \(responseString)")
            }
            
            let eventsResponse = try JSONDecoder().decode(CalendarEventsResponse.self, from: data)
            
            // Match Android: result is List<CalendarEvent> (not optional in Android)
            let events = (eventsResponse.result ?? []).map { $0.toDomain() }
            print("✅ Fetched \(events.count) calendar events")
            
            if events.isEmpty {
                print("⚠️ Calendar returned empty - check if events exist in Bitrix24")
                print("   Response had result: \(eventsResponse.result != nil)")
                print("   Result count: \(eventsResponse.result?.count ?? 0)")
            } else {
                events.forEach { event in
                    print("   📅 Event: \(event.name ?? "No name") - \(event.fromDate ?? "No date")")
                }
            }
            
            return events
        } catch {
            print("⚠️ Failed to decode calendar events: \(error)")
            if let decodingError = error as? DecodingError {
                print("   Decoding error details: \(decodingError)")
                switch decodingError {
                case .keyNotFound(let key, let context):
                    print("   Missing key: \(key.stringValue) at \(context.codingPath)")
                case .typeMismatch(let type, let context):
                    print("   Type mismatch: expected \(type) at \(context.codingPath)")
                case .valueNotFound(let type, let context):
                    print("   Value not found: \(type) at \(context.codingPath)")
                case .dataCorrupted(let context):
                    print("   Data corrupted at \(context.codingPath): \(context.debugDescription)")
                @unknown default:
                    print("   Unknown decoding error")
                }
            }
            // Log the actual response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("   Full response: \(responseString)")
            }
            throw APIError.decodingError
        }
    }
    
    func getBlogFeed(start: Int? = nil, limit: Int? = nil) async throws -> [BlogPost] {
        // Match Android: GET request with optional POST_ID query parameter
        // Android doesn't use pagination by default - it gets all posts
        // Only add pagination if explicitly requested
        var components = URLComponents(string: "\(apiUrl)log.blogpost.get.json")!
        var queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        // Only add pagination parameters if both are provided (for load more functionality)
        // Otherwise, fetch all posts like Android does
        if let start = start, let limit = limit, start > 0 {
            queryItems.append(URLQueryItem(name: "start", value: String(start)))
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        
        components.queryItems = queryItems
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for blog feed")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        // Log response for debugging
        if let responseString = String(data: data, encoding: .utf8) {
            print("📰 Blog feed API response (first 500 chars): \(String(responseString.prefix(500)))")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Blog feed API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getBlogFeed: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        do {
            let feedResponse = try JSONDecoder().decode(BlogFeedResponse.self, from: data)
            
            if let error = feedResponse.error {
                print("❌ Bitrix24 error in feed: \(error) - \(feedResponse.error_description ?? "")")
                throw APIError.bitrixError(feedResponse.error_description ?? error)
            }
            
            // Match Android: use result directly (Android uses response.body()!!.result)
            let posts = feedResponse.posts.map { $0.toDomain() }
            print("✅ Fetched \(posts.count) feed posts")
            if posts.isEmpty {
                print("⚠️ Feed returned empty - check if API response structure matches")
            }
            return posts
        } catch {
            print("⚠️ Failed to decode blog feed: \(error)")
            if let decodingError = error as? DecodingError {
                print("   Decoding error details: \(decodingError)")
            }
            // Log the actual response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("   Full response: \(responseString)")
            }
            throw APIError.decodingError
        }
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }
        
        let addResponse = try JSONDecoder().decode(AddBlogPostResponse.self, from: data)
        return addResponse.result ?? ""
    }
    
    func getBlogPost(postId: String) async throws -> BlogPost {
        // Get a single post by ID
        var components = URLComponents(string: "\(apiUrl)log.blogpost.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "POST_ID", value: postId)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for blog post")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Blog post API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getBlogPost: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        do {
            let feedResponse = try JSONDecoder().decode(BlogFeedResponse.self, from: data)
            
            if let error = feedResponse.error {
                print("❌ Bitrix24 error in getBlogPost: \(error) - \(feedResponse.error_description ?? "")")
                throw APIError.bitrixError(feedResponse.error_description ?? error)
            }
            
            guard let postDto = feedResponse.posts.first else {
                throw APIError.noData
            }
            
            print("✅ Fetched blog post: \(postId)")
            return postDto.toDomain()
        } catch {
            print("⚠️ Failed to decode blog post: \(error)")
            throw APIError.decodingError
        }
    }
    
    func getBlogPostComments(postId: String) async throws -> [BlogComment] {
        // Get comments for a specific post
        var components = URLComponents(string: "\(apiUrl)log.blogcomment.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "POST_ID", value: postId)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for blog comments")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Blog comments API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in getBlogPostComments: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        do {
            let commentsResponse = try JSONDecoder().decode(BlogCommentsResponse.self, from: data)
            
            if let error = commentsResponse.error {
                print("❌ Bitrix24 error in getBlogPostComments: \(error) - \(commentsResponse.error_description ?? "")")
                throw APIError.bitrixError(commentsResponse.error_description ?? error)
            }
            
            let comments = (commentsResponse.result ?? []).map { $0.toDomain() }
            print("✅ Fetched \(comments.count) comments for post \(postId)")
            return comments
        } catch {
            print("⚠️ Failed to decode blog comments: \(error)")
            throw APIError.decodingError
        }
    }
    
    func addBlogPostComment(postId: String, text: String) async throws -> String {
        // Add a comment to a blog post
        var components = URLComponents(string: "\(apiUrl)log.blogcomment.add.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken)
        ]
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        struct AddCommentRequest: Codable {
            let postId: String
            let text: String
            
            enum CodingKeys: String, CodingKey {
                case postId = "POST_ID"
                case text = "POST_TEXT"
            }
        }
        
        let body = AddCommentRequest(postId: postId, text: text)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for add blog comment")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Add blog comment API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in addBlogPostComment: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        struct AddCommentResponse: Codable {
            let result: String?
            let error: String?
            let error_description: String?
        }
        
        do {
            let commentResponse = try JSONDecoder().decode(AddCommentResponse.self, from: data)
            
            if let error = commentResponse.error {
                throw APIError.bitrixError(commentResponse.error_description ?? error)
            }
            
            guard let commentId = commentResponse.result else {
                throw APIError.noData
            }
            
            print("✅ Added comment to post \(postId): \(commentId)")
            return commentId
        } catch {
            print("⚠️ Failed to decode add comment response: \(error)")
            throw APIError.decodingError
        }
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
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
        // Get files from the task object itself (like Android does)
        // Files are stored in UF_TASK_WEBDAV_FILES field
        do {
            // Get raw JSON response to parse files
            // IMPORTANT: Request UF_* fields like Android does with select[] parameter (array format)
            var components = URLComponents(string: "\(apiUrl)tasks.task.get.json")!
            components.queryItems = [
                URLQueryItem(name: "auth", value: accessToken),
                URLQueryItem(name: "taskId", value: taskId),
                // Request all fields including custom UF_* fields (like Android uses select[] array)
                URLQueryItem(name: "select[]", value: "*"),
                URLQueryItem(name: "select[]", value: "UF_*")
            ]
            
            guard let url = components.url else {
                throw APIError.invalidURL
            }
            
            let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("⚠️ Failed to get task for files: Invalid HTTP response")
                return []
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                print("⚠️ Failed to get task for files: HTTP \(httpResponse.statusCode)")
                return []
            }
            
            // Parse raw JSON to extract files
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let result = json["result"] as? [String: Any],
                  let task = result["task"] as? [String: Any] else {
                print("⚠️ Failed to parse task JSON")
                // Log the actual response for debugging
                if let responseString = String(data: data, encoding: .utf8) {
                    print("   Response: \(responseString.prefix(1000))")
                }
                return []
            }
            
            // Log all keys in task to see what fields are available
            let taskKeys = Array(task.keys).sorted()
            print("📁 Task fields available: \(taskKeys.joined(separator: ", "))")
            
            // Try to get files from various possible fields (check all variations like Android)
            var files: [TaskFileDto] = []
            
            // Check multiple field name variations (Android checks: ufTaskWebdavFiles, FILES, files)
            let filesData = task["UF_TASK_WEBDAV_FILES"] ?? 
                           task["ufTaskWebdavFiles"] ?? 
                           task["FILES"] ?? 
                           task["files"]
            
            if let filesData = filesData {
                print("📁 Found files data, type: \(type(of: filesData))")
                files = try await parseFilesFromJson(filesData)
            } else {
                print("⚠️ No files field found in task response")
            }
            
            print("✅ Found \(files.count) files for task \(taskId)")
            if files.isEmpty {
                // Log task structure for debugging
                print("   Task keys: \(taskKeys)")
            }
            return files
        } catch {
            print("⚠️ Failed to get task files: \(error.localizedDescription)")
            return []
        }
    }
    
    private func parseFilesFromJson(_ filesData: Any) async throws -> [TaskFileDto] {
        var files: [TaskFileDto] = []
        
        // Handle different data types
        if let fileArray = filesData as? [[String: Any]] {
            // Array of file objects
            for fileDict in fileArray {
                if let file = parseFileObject(fileDict) {
                    files.append(file)
                }
            }
        } else if let fileDict = filesData as? [String: Any] {
            // Dictionary of files (key-value pairs)
            for (_, value) in fileDict {
                if let fileObj = value as? [String: Any],
                   let file = parseFileObject(fileObj) {
                    files.append(file)
                } else if let fileId = (value as? String) ?? (value as? Int).map(String.init) {
                    // Just an ID - fetch details using disk.attachedObject.get
                    print("📁 File ID found: \(fileId), fetching details...")
                    if let attachedFile = try await fetchAttachedObject(attachmentId: fileId) {
                        files.append(attachedFile)
                        print("✅ Successfully fetched file details for ID \(fileId): \(attachedFile.name ?? "Unknown")")
                    } else {
                        print("⚠️ Failed to fetch file details for ID \(fileId)")
                    }
                }
            }
        } else if let fileArray = filesData as? [Any] {
            // Array of file IDs or objects
            for item in fileArray {
                if let fileObj = item as? [String: Any],
                   let file = parseFileObject(fileObj) {
                    files.append(file)
                } else if let fileId = (item as? String) ?? (item as? Int).map(String.init) {
                    // Just an ID - fetch details using disk.attachedObject.get
                    print("📁 File ID found in array: \(fileId), fetching details...")
                    if let attachedFile = try await fetchAttachedObject(attachmentId: fileId) {
                        files.append(attachedFile)
                        print("✅ Successfully fetched file details for ID \(fileId): \(attachedFile.name ?? "Unknown")")
                    } else {
                        print("⚠️ Failed to fetch file details for ID \(fileId)")
                    }
                }
            }
        }
        
        return files
    }
    
    /// Fetch attached object details when file is just an ID
    /// Uses disk.attachedObject.get.json API
    private func fetchAttachedObject(attachmentId: String) async throws -> TaskFileDto? {
        var components = URLComponents(string: "\(apiUrl)disk.attachedObject.get.json")!
        components.queryItems = [
            URLQueryItem(name: "auth", value: accessToken),
            URLQueryItem(name: "id", value: attachmentId)
        ]
        
        guard let url = components.url else {
            print("⚠️ Invalid URL for disk.attachedObject.get")
            return nil
        }
        
        do {
            let (data, response) = try await BitrixApiClient.configuredSession.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("⚠️ Invalid HTTP response for disk.attachedObject.get")
                return nil
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("⚠️ disk.attachedObject.get error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
                return nil
            }
            
            // Check for Bitrix24 errors
            if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
               let error = errorResponse.error {
                print("⚠️ Bitrix24 error in disk.attachedObject.get: \(error)")
                return nil
            }
            
            // Parse response
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let result = json["result"] as? [String: Any] else {
                print("⚠️ Failed to parse attached object response")
                return nil
            }
            
            // Extract file details
            let id = (result["ID"] as? String) ?? (result["id"] as? String) ?? attachmentId
            let name = (result["NAME"] as? String) ?? (result["name"] as? String) ?? "Unknown"
            
            // Extract size - break up complex expression to help compiler
            let sizeString = (result["SIZE"] as? String) ?? (result["size"] as? String)
            let sizeInt = (result["SIZE"] as? Int) ?? (result["size"] as? Int)
            let size = sizeString ?? (sizeInt.map(String.init) ?? "0")
            
            let type = (result["TYPE"] as? String) ?? (result["type"] as? String) ?? "application/octet-stream"
            
            // Try multiple URL field names (DOWNLOADABLE_URL, DOWNLOAD_URL, URL)
            let downloadUrl = (result["DOWNLOADABLE_URL"] as? String) ?? 
                             (result["downloadableUrl"] as? String) ??
                             (result["DOWNLOAD_URL"] as? String) ?? 
                             (result["downloadUrl"] as? String) ??
                             (result["URL"] as? String) ?? 
                             (result["url"] as? String)
            
            if downloadUrl == nil {
                print("⚠️ No download URL found for attached object \(attachmentId)")
                return nil
            }
            
            return TaskFileDto(
                id: id,
                name: name,
                size: size,
                type: type,
                downloadUrl: downloadUrl,
                url: downloadUrl
            )
        } catch {
            print("⚠️ Error fetching attached object \(attachmentId): \(error.localizedDescription)")
            return nil
        }
    }
    
    private func parseFileObject(_ fileDict: [String: Any]) -> TaskFileDto? {
        // Extract ID - can be String or Int
        guard let id = (fileDict["ID"] as? String) ?? (fileDict["id"] as? String) ?? 
                       (fileDict["ID"] as? Int).map(String.init) ?? 
                       (fileDict["id"] as? Int).map(String.init) else {
            print("   ⚠️ File object missing ID: \(fileDict.keys)")
            return nil
        }
        
        // Extract name
        let name = (fileDict["NAME"] as? String) ?? (fileDict["name"] as? String) ?? "Unknown"
        
        // Extract size - can be String or Int
        let size = (fileDict["SIZE"] as? String) ?? (fileDict["size"] as? String) ?? 
                   (fileDict["SIZE"] as? Int).map(String.init) ?? 
                   (fileDict["size"] as? Int).map(String.init) ?? "0"
        
        // Extract type
        let type = (fileDict["TYPE"] as? String) ?? (fileDict["type"] as? String) ?? "application/octet-stream"
        
        // Extract download URL - check multiple possible field names
        let downloadUrl = (fileDict["DOWNLOAD_URL"] as? String) ?? 
                          (fileDict["downloadUrl"] as? String) ?? 
                          (fileDict["download_url"] as? String) ??
                          (fileDict["URL"] as? String) ?? 
                          (fileDict["url"] as? String)
        
        // Create TaskFileDto manually since we can't use Codable with raw dictionaries
        return TaskFileDto(
            id: id,
            name: name,
            size: size,
            type: type,
            downloadUrl: downloadUrl,
            url: downloadUrl
        )
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for uploadFile")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        // Log response for debugging
        if let responseString = String(data: data, encoding: .utf8) {
            print("📤 File upload API response (first 500 chars): \(String(responseString.prefix(500)))")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ File upload API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            
            // Special handling for 413 (Request Entity Too Large)
            if httpResponse.statusCode == 413 {
                throw APIError.bitrixError("File is too large. Maximum file size is approximately 10-15MB. Please compress or resize the file.")
            }
            
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in uploadFile: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
        }
        
        struct FileUploadResponse: Codable {
            let result: FileUploadResult?
            let error: String?
            let error_description: String?
        }
        
        struct FileUploadResult: Codable {
            let id: String
            
            enum CodingKeys: String, CodingKey {
                case id = "ID"
            }
            
            // Custom decoder to handle ID as either String or Int
            init(from decoder: Decoder) throws {
                let container = try decoder.container(keyedBy: CodingKeys.self)
                
                // Try to decode as String first, then Int, then fallback
                if let stringId = try? container.decode(String.self, forKey: .id) {
                    id = stringId
                } else if let intId = try? container.decode(Int.self, forKey: .id) {
                    id = String(intId)
                } else {
                    throw DecodingError.typeMismatch(String.self, DecodingError.Context(
                        codingPath: [CodingKeys.id],
                        debugDescription: "ID must be String or Int"
                    ))
                }
            }
        }
        
        do {
            let uploadResponse = try JSONDecoder().decode(FileUploadResponse.self, from: data)
            
            if let error = uploadResponse.error {
                throw APIError.bitrixError(uploadResponse.error_description ?? error)
            }
            
            guard let fileId = uploadResponse.result?.id, !fileId.isEmpty else {
                throw APIError.noData
            }
            return fileId
        } catch {
            print("⚠️ Failed to decode file upload response: \(error)")
            if let decodingError = error as? DecodingError {
                print("   Decoding error details: \(decodingError)")
            }
            throw APIError.decodingError
        }
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
        
        let (data, response) = try await BitrixApiClient.configuredSession.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("❌ Invalid HTTP response for attachFileToTask")
            throw APIError.networkError(NSError(domain: "InvalidResponse", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Attach file API error: HTTP \(httpResponse.statusCode). Response: \(errorBody.prefix(200))")
            throw APIError.httpError(httpResponse.statusCode, errorBody)
        }
        
        // Check for Bitrix24 errors
        if let errorResponse = try? JSONDecoder().decode(BitrixErrorResponse.self, from: data),
           let error = errorResponse.error {
            print("❌ Bitrix24 error in attachFileToTask: \(error) - \(errorResponse.errorMessage ?? errorResponse.errorDescription ?? "")")
            throw APIError.bitrixError(errorResponse.errorMessage ?? errorResponse.errorDescription ?? error)
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
    
    // Custom initializer for manual creation from dictionaries
    init(id: String?, name: String?, size: String?, type: String?, downloadUrl: String?, url: String?) {
        self.id = id
        self.name = name
        self.size = size
        self.type = type
        self.downloadUrl = downloadUrl
        self.url = url
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
            // Provide user-friendly messages for common network errors
            if let urlError = error as? URLError {
                switch urlError.code {
                case .timedOut:
                    return "Request timed out. Please check your internet connection and try again."
                case .notConnectedToInternet:
                    return "No internet connection. Please check your network settings."
                case .networkConnectionLost:
                    return "Network connection lost. Please try again."
                case .cannotConnectToHost:
                    return "Cannot connect to server. Please check your internet connection."
                default:
                    return "Network error: \(urlError.localizedDescription)"
                }
            }
            return "Network error: \(error.localizedDescription)"
        case .httpError(let code, let message):
            // Provide user-friendly messages for common HTTP errors
            switch code {
            case 401:
                return "Authentication failed. Please sign in again."
            case 403:
                return "You don't have permission to perform this action."
            case 404:
                return "The requested resource was not found."
            case 500...599:
                return "Server error. Please try again later."
            default:
                return message ?? "HTTP \(code): Unknown error"
            }
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
