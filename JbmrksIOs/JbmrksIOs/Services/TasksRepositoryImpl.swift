//
//  TasksRepositoryImpl.swift
//  JbmrksIOs
//
//  Native Swift TasksRepository implementation (temporary)
//

import Foundation

nonisolated class TasksRepositoryImpl: TasksRepository {
    private let apiClient: BitrixApiClient
    private let tokenStorage: TokenStorage
    private let baseUrl: String
    
    init(apiClient: BitrixApiClient, tokenStorage: TokenStorage) {
        self.apiClient = apiClient
        self.tokenStorage = tokenStorage
        self.baseUrl = apiClient.baseUrl
    }
    
    private var requestHelper: APIRequestHelper {
        APIRequestHelper(baseApiClient: apiClient, tokenStorage: tokenStorage, baseUrl: baseUrl)
    }
    
    func getTasks(
        responsibleId: String?,
        createdBy: String?,
        status: String?,
        groupId: String?
    ) async throws -> [Task] {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.getTasks(
                responsibleId: responsibleId,
                createdBy: createdBy,
                status: status,
                groupId: groupId
            )
        }
        
        guard let result = response.result else {
            return []
        }
        
        // Flatten the dictionary values into a single array
        let tasks = result.values.flatMap { $0 }.map { $0.toDomain() }
        return tasks
    }
    
    func getTask(id: String) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.getTask(id: id)
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func createTask(
        title: String,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.createTask(
                title: title,
                description: description,
                deadline: deadline,
                priority: priority
            )
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func completeTask(id: String) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.completeTask(id: id)
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func startTask(id: String) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.startTask(id: id)
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func deferTask(id: String) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.deferTask(id: id)
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func renewTask(id: String) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.renewTask(id: id)
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func deleteTask(id: String) async throws {
        try await requestHelper.executeWithTokenRefresh { client in
            try await client.deleteTask(id: id)
        }
    }
    
    func updateTask(
        id: String,
        title: String?,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> Task {
        let response = try await requestHelper.executeWithTokenRefresh { client in
            try await client.updateTask(
                id: id,
                title: title,
                description: description,
                deadline: deadline,
                priority: priority
            )
        }
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func getTaskComments(taskId: String) async throws -> [Comment] {
        let commentDtos = try await requestHelper.executeWithTokenRefresh { client in
            try await client.getTaskComments(taskId: taskId)
        }
        
        // Fetch author names for all comments
        var comments: [Comment] = []
        for dto in commentDtos {
            var authorName: String? = nil
            if let authorId = dto.authorId ?? dto.authorIdUpper {
                do {
                    let user = try await requestHelper.executeWithTokenRefresh { client in
                        try await client.getUser(id: authorId)
                    }
                    authorName = user.fullName
                } catch {
                    // Use author info from DTO if available
                    authorName = dto.author?.getAuthorDisplayName() ?? dto.authorUpper?.getAuthorDisplayName()
                }
            } else {
                authorName = dto.author?.getAuthorDisplayName() ?? dto.authorUpper?.getAuthorDisplayName()
            }
            comments.append(dto.toDomain(authorName: authorName))
        }
        return comments
    }
    
    func addTaskComment(taskId: String, message: String, fileIds: [String]?) async throws -> Comment {
        let commentId = try await requestHelper.executeWithTokenRefresh { client in
            try await client.addTaskComment(taskId: taskId, text: message, fileIds: fileIds)
        }
        // Reload comments to get the new one
        let comments = try await getTaskComments(taskId: taskId)
        guard let newComment = comments.first(where: { $0.id == commentId }) else {
            throw APIError.noData
        }
        return newComment
    }
    
    func getTaskFiles(taskId: String) async throws -> [TaskFile] {
        let fileDtos = try await requestHelper.executeWithTokenRefresh { client in
            try await client.getTaskFiles(taskId: taskId)
        }
        return fileDtos.map { $0.toDomain() }
    }
    
    func uploadTaskFile(taskId: String, fileData: Data, fileName: String) async throws -> TaskFile {
        // Upload file with token refresh
        let fileId = try await requestHelper.executeWithTokenRefresh { client in
            try await client.uploadFile(fileData: fileData, fileName: fileName)
        }
        // Attach to task with token refresh
        try await requestHelper.executeWithTokenRefresh { client in
            try await client.attachFileToTask(taskId: taskId, fileId: fileId)
        }
        // Reload files to get the new one
        let files = try await getTaskFiles(taskId: taskId)
        guard let newFile = files.first(where: { $0.id == fileId }) else {
            throw APIError.noData
        }
        return newFile
    }
}
