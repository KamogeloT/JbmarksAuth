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
                        // Always use manual parsing to handle inconsistent API responses
                        val task = parseTaskManually(taskObj)
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
                        // Always use manual parsing to handle inconsistent API responses
                        val task = parseTaskManually(taskObj)
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
            
            // Parse nested responsible object
            val responsibleElement = jsonObject.get("responsible")
            val responsible = when {
                responsibleElement == null || responsibleElement.isJsonNull -> null
                responsibleElement.isJsonObject -> {
                    val obj = responsibleElement.asJsonObject
                    com.example.jbmarks.tasks.data.TaskUser(
                        id = obj.get("id")?.takeIf { !it.isJsonNull }?.asString,
                        name = obj.get("name")?.takeIf { !it.isJsonNull }?.asString,
                        link = obj.get("link")?.takeIf { !it.isJsonNull }?.asString,
                        icon = obj.get("icon")?.takeIf { !it.isJsonNull }?.asString,
                        workPosition = obj.get("workPosition")?.takeIf { !it.isJsonNull }?.asString
                    )
                }
                else -> null
            }
            
            // Parse nested creator object
            val creatorElement = jsonObject.get("creator")
            val creator = when {
                creatorElement == null || creatorElement.isJsonNull -> null
                creatorElement.isJsonObject -> {
                    val obj = creatorElement.asJsonObject
                    com.example.jbmarks.tasks.data.TaskUser(
                        id = obj.get("id")?.takeIf { !it.isJsonNull }?.asString,
                        name = obj.get("name")?.takeIf { !it.isJsonNull }?.asString,
                        link = obj.get("link")?.takeIf { !it.isJsonNull }?.asString,
                        icon = obj.get("icon")?.takeIf { !it.isJsonNull }?.asString,
                        workPosition = obj.get("workPosition")?.takeIf { !it.isJsonNull }?.asString
                    )
                }
                else -> null
            }
            
            // Parse nested group object (can be object, array, or null)
            val groupElement = jsonObject.get("group")
            val group = when {
                groupElement == null || groupElement.isJsonNull -> null
                groupElement.isJsonObject -> {
                    val groupObj = groupElement.asJsonObject
                    com.example.jbmarks.tasks.data.TaskGroup(
                        id = groupObj.get("id")?.takeIf { !it.isJsonNull }?.asString,
                        name = groupObj.get("name")?.takeIf { !it.isJsonNull }?.asString,
                        opened = groupObj.get("opened")?.takeIf { !it.isJsonNull }?.asBoolean,
                        membersCount = groupObj.get("membersCount")?.takeIf { !it.isJsonNull }?.asInt
                    )
                }
                groupElement.isJsonArray -> {
                    // If group is an array, take the first element
                    val groupArray = groupElement.asJsonArray
                    if (groupArray.size() > 0 && groupArray[0].isJsonObject) {
                        val groupObj = groupArray[0].asJsonObject
                        com.example.jbmarks.tasks.data.TaskGroup(
                            id = groupObj.get("id")?.takeIf { !it.isJsonNull }?.asString,
                            name = groupObj.get("name")?.takeIf { !it.isJsonNull }?.asString,
                            opened = groupObj.get("opened")?.takeIf { !it.isJsonNull }?.asBoolean,
                            membersCount = groupObj.get("membersCount")?.takeIf { !it.isJsonNull }?.asInt
                        )
                    } else {
                        null
                    }
                }
                else -> null
            }
            
            // Helper function to safely get string from JsonElement
            fun getStringOrNull(element: JsonElement?): String? {
                return when {
                    element == null -> null
                    element.isJsonNull -> null
                    element.isJsonPrimitive && element.asJsonPrimitive.isString -> element.asString
                    else -> null
                }
            }
            
            // Helper function to safely get int from JsonElement
            fun getIntOrNull(element: JsonElement?): Int? {
                return when {
                    element == null -> null
                    element.isJsonNull -> null
                    element.isJsonPrimitive && element.asJsonPrimitive.isNumber -> element.asInt
                    element.isJsonPrimitive && element.asJsonPrimitive.isString -> element.asString.toIntOrNull()
                    else -> null
                }
            }
            
            Task(
                id = id,
                title = getStringOrNull(jsonObject.get("title")) ?: "No Title",
                description = getStringOrNull(jsonObject.get("description")) ?: "",
                responsibleId = getStringOrNull(jsonObject.get("responsibleId")),
                createdBy = getStringOrNull(jsonObject.get("createdBy")),
                accomplices = accomplicesList,
                auditors = auditorsList,
                deadline = getStringOrNull(jsonObject.get("deadline")),
                status = getStringOrNull(jsonObject.get("status")),
                priority = getStringOrNull(jsonObject.get("priority")),
                groupId = getStringOrNull(jsonObject.get("groupId")),
                responsible = responsible,
                creator = creator,
                group = group,
                commentsCount = getStringOrNull(jsonObject.get("commentsCount")),
                newCommentsCount = getIntOrNull(jsonObject.get("newCommentsCount"))
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error in manual task parsing", e)
            null
        }
    }
}
