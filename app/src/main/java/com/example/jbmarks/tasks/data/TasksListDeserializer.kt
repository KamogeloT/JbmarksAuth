package com.example.jbmarks.tasks.data

import android.util.Log
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.lang.reflect.Type

/**
 * Custom deserializer for tasks list response
 * Bitrix24 API can return tasks as either:
 * - An array: { "result": { "tasks": [...] } }
 * - A map: { "result": { "tasks": { "123": {...}, "456": {...} } } }
 * This deserializer handles both cases
 */
class TasksListDeserializer : JsonDeserializer<TasksListResponse> {
    private val TAG = "TasksListDeserializer"
    
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): TasksListResponse {
        if (json == null || !json.isJsonObject) {
            Log.w(TAG, "JSON is null or not an object")
            return TasksListResponse(ResultObject(emptyList()))
        }

        val jsonObject = json.asJsonObject
        val resultObj = jsonObject.getAsJsonObject("result") ?: run {
            Log.w(TAG, "No 'result' object found")
            return TasksListResponse(ResultObject(emptyList()))
        }
        
        val tasksElement = resultObj.get("tasks") ?: run {
            Log.w(TAG, "No 'tasks' field found in result")
            return TasksListResponse(ResultObject(emptyList()))
        }

        val tasks = mutableListOf<Task>()
        
        when {
            tasksElement.isJsonArray -> {
                // Handle array format: tasks: [...]
                Log.d(TAG, "Tasks is an array with ${tasksElement.asJsonArray.size()} items")
                tasksElement.asJsonArray.forEachIndexed { index, taskElement ->
                    if (taskElement.isJsonObject) {
                        val taskObj = taskElement.asJsonObject
                        Log.d(TAG, "Task[$index] keys: ${taskObj.keySet()}")
                        // Try to manually parse if deserialization fails
                        val task = try {
                            context?.deserialize<Task>(taskElement, Task::class.java)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to deserialize task[$index]", e)
                            // Try manual parsing
                            parseTaskManually(taskObj)
                        }
                        task?.let { tasks.add(it) }
                    }
                }
            }
            tasksElement.isJsonObject -> {
                // Handle map format: tasks: { "123": {...}, "456": {...} }
                val tasksMap = tasksElement.asJsonObject
                Log.d(TAG, "Tasks is a map with ${tasksMap.size()} entries")
                tasksMap.entrySet().forEach { entry ->
                    val taskElement = entry.value
                    if (taskElement.isJsonObject) {
                        val taskObj = taskElement.asJsonObject
                        Log.d(TAG, "Task[${entry.key}] keys: ${taskObj.keySet()}")
                        val task = try {
                            context?.deserialize<Task>(taskElement, Task::class.java)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to deserialize task[${entry.key}]", e)
                            parseTaskManually(taskObj)
                        }
                        task?.let { tasks.add(it) }
                    }
                }
            }
            else -> {
                Log.w(TAG, "Tasks element is neither array nor object: ${tasksElement.javaClass.simpleName}")
            }
        }

        Log.d(TAG, "Deserialized ${tasks.size} tasks")
        return TasksListResponse(ResultObject(tasks))
    }
    
    private fun parseTaskManually(jsonObject: JsonObject): Task? {
        return try {
            // API returns lowercase field names
            val id = jsonObject.get("id")?.asString
            
            if (id == null) {
                Log.w(TAG, "Task has no id field, available keys: ${jsonObject.keySet()}")
                return null
            }
            
            // Parse accomplices and auditors as lists if they exist
            val accomplicesList = jsonObject.get("accomplices")?.let {
                if (it.isJsonArray) {
                    it.asJsonArray.mapNotNull { elem -> elem.asString }
                } else {
                    null
                }
            }
            
            val auditorsList = jsonObject.get("auditors")?.let {
                if (it.isJsonArray) {
                    it.asJsonArray.mapNotNull { elem -> elem.asString }
                } else {
                    null
                }
            }
            
            Task(
                id = id,
                title = jsonObject.get("title")?.asString ?: "No Title",
                description = jsonObject.get("description")?.asString ?: "",
                responsibleId = jsonObject.get("responsibleId")?.asString,
                createdBy = jsonObject.get("createdBy")?.asString,
                accomplices = accomplicesList,
                auditors = auditorsList,
                deadline = jsonObject.get("deadline")?.asString,
                status = jsonObject.get("status")?.asString,
                priority = jsonObject.get("priority")?.asString,
                groupId = jsonObject.get("groupId")?.asString
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error in manual task parsing", e)
            null
        }
    }
}
