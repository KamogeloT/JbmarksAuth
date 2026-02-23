//
//  TasksRepository.swift
//  JbmrksIOs
//
//  Native Swift TasksRepository (temporary - will migrate to KMM later)
//

import Foundation

protocol TasksRepository {
    func getTasks(
        responsibleId: String?,
        createdBy: String?,
        status: String?,
        groupId: String?
    ) async throws -> [Task]
    
    func getTask(id: String) async throws -> Task
    
    // Task status management
    func completeTask(id: String) async throws -> Task
    func startTask(id: String) async throws -> Task
    func deferTask(id: String) async throws -> Task
    func renewTask(id: String) async throws -> Task
    func deleteTask(id: String) async throws
    func updateTask(
        id: String,
        title: String?,
        description: String?,
        deadline: String?,
        priority: TaskPriority?
    ) async throws -> Task
    
    // Comments
    func getTaskComments(taskId: String) async throws -> [Comment]
    func addTaskComment(taskId: String, message: String, fileIds: [String]?) async throws -> Comment
    
    // Files
    func getTaskFiles(taskId: String) async throws -> [TaskFile]
    func uploadTaskFile(taskId: String, fileData: Data, fileName: String) async throws -> TaskFile
}
