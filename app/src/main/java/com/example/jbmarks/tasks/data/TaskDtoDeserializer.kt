package com.example.jbmarks.tasks.data

import android.util.Log
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.lang.reflect.Type

/**
 * Custom deserializer for TaskDto to handle inconsistent API responses
 * where 'group' field can be an object, array, or null
 */
class TaskDtoDeserializer : JsonDeserializer<TaskDto> {
    private val TAG = "TaskDtoDeserializer"
    
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): TaskDto? {
        if (json == null || !json.isJsonObject) {
            Log.w(TAG, "TaskDto JSON is null or not an object")
            return null
        }
        
        val jsonObject = json.asJsonObject
        
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
        
        // Helper function to safely get boolean from JsonElement
        fun getBooleanOrNull(element: JsonElement?): Boolean? {
            return when {
                element == null -> null
                element.isJsonNull -> null
                element.isJsonPrimitive && element.asJsonPrimitive.isBoolean -> element.asBoolean
                else -> null
            }
        }
        
        // Parse nested responsible object
        val responsibleElement = jsonObject.get("responsible")
        val responsible = when {
            responsibleElement == null || responsibleElement.isJsonNull -> null
            responsibleElement.isJsonObject -> {
                val obj = responsibleElement.asJsonObject
                TaskUser(
                    id = getStringOrNull(obj.get("id")),
                    name = getStringOrNull(obj.get("name")),
                    link = getStringOrNull(obj.get("link")),
                    icon = getStringOrNull(obj.get("icon")),
                    workPosition = getStringOrNull(obj.get("workPosition"))
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
                TaskUser(
                    id = getStringOrNull(obj.get("id")),
                    name = getStringOrNull(obj.get("name")),
                    link = getStringOrNull(obj.get("link")),
                    icon = getStringOrNull(obj.get("icon")),
                    workPosition = getStringOrNull(obj.get("workPosition"))
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
                TaskGroup(
                    id = getStringOrNull(groupObj.get("id")),
                    name = getStringOrNull(groupObj.get("name")),
                    opened = getBooleanOrNull(groupObj.get("opened")),
                    membersCount = getIntOrNull(groupObj.get("membersCount"))
                )
            }
            groupElement.isJsonArray -> {
                // If group is an array, take the first element
                val groupArray = groupElement.asJsonArray
                if (groupArray.size() > 0 && groupArray[0].isJsonObject) {
                    val groupObj = groupArray[0].asJsonObject
                    TaskGroup(
                        id = getStringOrNull(groupObj.get("id")),
                        name = getStringOrNull(groupObj.get("name")),
                        opened = getBooleanOrNull(groupObj.get("opened")),
                        membersCount = getIntOrNull(groupObj.get("membersCount"))
                    )
                } else {
                    null
                }
            }
            else -> null
        }
        
        // Parse accomplices and auditors as lists
        val accomplicesList = jsonObject.get("accomplices")?.let {
            if (it.isJsonArray) {
                it.asJsonArray.mapNotNull { elem -> 
                    if (elem.isJsonPrimitive && elem.asJsonPrimitive.isString) elem.asString else null
                }
            } else {
                null
            }
        }
        
        val auditorsList = jsonObject.get("auditors")?.let {
            if (it.isJsonArray) {
                it.asJsonArray.mapNotNull { elem -> 
                    if (elem.isJsonPrimitive && elem.asJsonPrimitive.isString) elem.asString else null
                }
            } else {
                null
            }
        }
        
        val tagsList = jsonObject.get("tags")?.let {
            if (it.isJsonArray) {
                it.asJsonArray.mapNotNull { elem -> 
                    if (elem.isJsonPrimitive && elem.asJsonPrimitive.isString) elem.asString else null
                }
            } else {
                null
            }
        }
        
        return TaskDto(
            id = getStringOrNull(jsonObject.get("id")),
            title = getStringOrNull(jsonObject.get("title")),
            description = getStringOrNull(jsonObject.get("description")),
            descriptionInBbcode = getStringOrNull(jsonObject.get("descriptionInBbcode")),
            createdBy = getStringOrNull(jsonObject.get("createdBy")),
            responsibleId = getStringOrNull(jsonObject.get("responsibleId")),
            accomplices = accomplicesList,
            auditors = auditorsList,
            status = getStringOrNull(jsonObject.get("status")),
            priority = getStringOrNull(jsonObject.get("priority")),
            mark = getStringOrNull(jsonObject.get("mark")),
            createdDate = getStringOrNull(jsonObject.get("createdDate")),
            changedDate = getStringOrNull(jsonObject.get("changedDate")),
            closedDate = getStringOrNull(jsonObject.get("closedDate")),
            deadline = getStringOrNull(jsonObject.get("deadline")),
            startDatePlan = getStringOrNull(jsonObject.get("startDatePlan")),
            endDatePlan = getStringOrNull(jsonObject.get("endDatePlan")),
            groupId = getStringOrNull(jsonObject.get("groupId")),
            parentId = getStringOrNull(jsonObject.get("parentId")),
            timeEstimate = getStringOrNull(jsonObject.get("timeEstimate")),
            timeSpentInLogs = getStringOrNull(jsonObject.get("timeSpentInLogs")),
            commentsCount = getStringOrNull(jsonObject.get("commentsCount")),
            newCommentsCount = getIntOrNull(jsonObject.get("newCommentsCount")),
            forumTopicId = getStringOrNull(jsonObject.get("forumTopicId")),
            tags = tagsList,
            // Parse files - can be in ufTaskWebdavFiles, FILES, or files field
            files = jsonObject.get("ufTaskWebdavFiles")?.let { 
                if (it.isJsonNull) null else it
            },
            filesUpper = jsonObject.get("FILES")?.let { 
                if (it.isJsonNull) null else it
            },
            filesLower = jsonObject.get("files")?.let { 
                if (it.isJsonNull) null else it
            },
            group = group,
            creator = creator,
            responsible = responsible
        )
    }
}
