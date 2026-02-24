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
    
    init(apiClient: BitrixApiClient, tokenStorage: TokenStorage) {
        self.apiClient = apiClient
        self.tokenStorage = tokenStorage
    }
    
    func getTasks(
        responsibleId: String?,
        createdBy: String?,
        status: String?,
        groupId: String?
    ) async throws -> [Task] {
        let response = try await apiClient.getTasks(
            responsibleId: responsibleId,
            createdBy: createdBy,
            status: status,
            groupId: groupId
        )
        
        guard let result = response.result else {
            return []
        }
        
        // Flatten the dictionary values into a single array
        let tasks = result.values.flatMap { $0 }.map { $0.toDomain() }
        return tasks
    }
    
    func getTask(id: String) async throws -> Task {
        let response = try await apiClient.getTask(id: id)
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func completeTask(id: String) async throws -> Task {
        let response = try await apiClient.completeTask(id: id)
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func startTask(id: String) async throws -> Task {
        let response = try await apiClient.startTask(id: id)
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func deferTask(id: String) async throws -> Task {
        let response = try await apiClient.deferTask(id: id)
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func renewTask(id: String) async throws -> Task {
        let response = try await apiClient.renewTask(id: id)
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func deleteTask(id: String) async throws {
        try await apiClient.deleteTask(id: id)
    }
    
    func updateTask(
        id: String,
        title: String?,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> Task {
        let response = try await apiClient.updateTask(
            id: id,
            title: title,
            description: description,
            deadline: deadline,
            priority: priority
        )
        guard let taskDto = response.result?.task else {
            throw APIError.noData
        }
        return taskDto.toDomain()
    }
    
    func getTaskComments(taskId: String) async throws -> [Comment] {
        let commentDtos = try await apiClient.getTaskComments(taskId: taskId)
        
        // Fetch author names for all comments
        var comments: [Comment] = []
        for dto in commentDtos {
            var authorName: String? = nil
            if let authorId = dto.authorId ?? dto.authorIdUpper {
                do {
                    let user = try await apiClient.getUser(id: authorId)
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
        let commentId = try await apiClient.addTaskComment(taskId: taskId, text: message, fileIds: fileIds)
        // Reload comments to get the new one
        let comments = try await getTaskComments(taskId: taskId)
        guard let newComment = comments.first(where: { $0.id == commentId }) else {
            throw APIError.noData
        }
        return newComment
    }
    
    func getTaskFiles(taskId: String) async throws -> [TaskFile] {
        let fileDtos = try await apiClient.getTaskFiles(taskId: taskId)
        return fileDtos.map { $0.toDomain() }
    }
    
    func uploadTaskFile(taskId: String, fileData: Data, fileName: String) async throws -> TaskFile {
        // Upload file
        let fileId = try await apiClient.uploadFile(fileData: fileData, fileName: fileName)
        // Attach to task
        try await apiClient.attachFileToTask(taskId: taskId, fileId: fileId)
        // Reload files to get the new one
        let files = try await getTaskFiles(taskId: taskId)
        guard let newFile = files.first(where: { $0.id == fileId }) else {
            throw APIError.noData
        }
        return newFile
    }
}
