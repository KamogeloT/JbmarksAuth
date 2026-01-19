import axios from 'axios';
import { Task, KanbanStage, TaskFormData, BitrixResponse, PaginatedResponse, TaskStatus, TaskFile, TaskComment, TaskCommentFormData } from '../../types';
import apiClient from './client';
import { Config } from '../../constants/config';

// Map Bitrix24 task status to our status
const mapTaskStatus = (status: string): TaskStatus => {
  const statusMap: Record<string, TaskStatus> = {
    '1': 'NEW',
    '2': 'PENDING',
    '3': 'IN_PROGRESS',
    '4': 'SUPPOSEDLY_COMPLETED',
    '5': 'COMPLETED',
    '6': 'DEFERRED',
  };
  return statusMap[status] || 'NEW';
};

// New function to get file details by ID
async function getFileDetails(fileId: number): Promise<TaskFile> {
  try {
    const response = await apiClient.post('/rest/disk.file.get', { id: fileId });

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    const fileData = response.data.result;

    return {
      id: parseInt(fileData.ID || fileData.id || '0'),
      name: fileData.NAME || fileData.name || 'Unknown',
      size: parseInt(fileData.SIZE || fileData.size || '0'),
      type: fileData.TYPE || fileData.type || 'application/octet-stream',
      url: fileData.DOWNLOAD_URL || fileData.URL || fileData.url || '',
    };
  } catch (error: any) {
    console.error(`Error fetching file details for ID ${fileId}:`, error);
    // Return a placeholder or re-throw, depending on desired error handling
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch file details'
    );
  }
}

// Get all tasks
export async function getTasks(params?: {
  filter?: Record<string, any>;
  order?: Record<string, 'asc' | 'desc'>;
  select?: string[];
  start?: number;
}): Promise<PaginatedResponse<Task>> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.list', {
      filter: params?.filter || {},
      order: params?.order || { DEADLINE: 'asc' },
      select: params?.select || ['*', 'UF_*'],
      start: params?.start || 0,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const tasks = (response.data.result.tasks || []).map((task: any) => ({
    id: parseInt(task.id),
    title: task.title,
    description: task.description,
    status: mapTaskStatus(task.status),
    priority: task.priority === '2' ? 'HIGH' : task.priority === '0' ? 'LOW' : 'NORMAL',
    createdBy: parseInt(task.createdBy),
    responsibleId: parseInt(task.responsibleId),
    createdDate: task.createdDate,
    deadline: task.deadline,
    closedDate: task.closedDate,
    stageId: task.stageId ? parseInt(task.stageId) : undefined,
    groupId: task.groupId ? parseInt(task.groupId) : undefined,
    tags: task.tags || [],
  }));
  
    return {
      items: tasks,
      total: response.data.total || tasks.length,
      hasMore: !!response.data.next,
      next: response.data.next,
    };
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch tasks'
    );
  }
}

// Get single task by ID
export async function getTask(taskId: number): Promise<Task> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/tasks.task.get', {
      params: { taskId, select: ['*', 'UF_*'] },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const task = response.data.result.task;
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    const files: TaskFile[] = [];
    if (task.ufTaskWebdavFiles) {
      const fileArray = Array.isArray(task.ufTaskWebdavFiles) ? task.ufTaskWebdavFiles : Object.values(task.ufTaskWebdavFiles);
      for (const fileItem of fileArray) {
        if (typeof fileItem === 'object' && fileItem !== null) {
          files.push({
            id: parseInt(fileItem.ID || fileItem.id || '0'),
            name: fileItem.NAME || fileItem.name || 'Unknown',
            size: parseInt(fileItem.SIZE || fileItem.size || '0'),
            type: fileItem.TYPE || fileItem.type || 'application/octet-stream',
            url: fileItem.DOWNLOAD_URL || fileItem.URL || fileItem.url || '',
          });
        } else if (typeof fileItem === 'number' || typeof fileItem === 'string') {
          try {
            const fileDetails = await getFileDetails(parseInt(String(fileItem), 10));
            files.push(fileDetails);
          } catch (error) {
            console.warn(`Could not fetch details for file ID ${fileItem}:`, error);
          }
        }
      }
    }
    
    return {
    id: parseInt(task.id),
    title: task.title,
    description: task.description,
    status: mapTaskStatus(task.status),
    priority: task.priority === '2' ? 'HIGH' : task.priority === '0' ? 'LOW' : 'NORMAL',
    createdBy: parseInt(task.createdBy),
    responsibleId: parseInt(task.responsibleId),
    createdDate: task.createdDate,
    deadline: task.deadline,
    closedDate: task.closedDate,
    stageId: task.stageId ? parseInt(task.stageId) : undefined,
    groupId: task.groupId ? parseInt(task.groupId) : undefined,
    tags: task.tags || [],
    files: files.length > 0 ? files : undefined,
  };
  } catch (error: any) {
    console.error('Error fetching task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch task'
    );
  }
}

// Create new task
export async function createTask(data: TaskFormData): Promise<Task> {
  try {
    if (!data.title || !data.title.trim()) {
      throw new Error('Task title is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.add', {
      fields: {
        TITLE: data.title,
        DESCRIPTION: data.description,
        RESPONSIBLE_ID: data.responsibleId,
        DEADLINE: data.deadline,
        PRIORITY: data.priority === 'HIGH' ? '2' : data.priority === 'LOW' ? '0' : '1',
        GROUP_ID: data.groupId,
        TAGS: data.tags,
      },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const taskId = response.data.result?.task?.id;
    
    if (!taskId) {
      throw new Error('Failed to create task: No task ID returned');
    }
    
    return getTask(taskId);
  } catch (error: any) {
    console.error('Error creating task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to create task'
    );
  }
}

// Update task
export async function updateTask(taskId: number, data: Partial<TaskFormData>): Promise<Task> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    const fields: Record<string, any> = {};
    if (data.title) fields.TITLE = data.title;
    if (data.description !== undefined) fields.DESCRIPTION = data.description;
    if (data.responsibleId) fields.RESPONSIBLE_ID = data.responsibleId;
    if (data.deadline) fields.DEADLINE = data.deadline;
    if (data.priority) fields.PRIORITY = data.priority === 'HIGH' ? '2' : data.priority === 'LOW' ? '0' : '1';
    if (data.groupId) fields.GROUP_ID = data.groupId;
    if (data.tags) fields.TAGS = data.tags;
    
    if (Object.keys(fields).length === 0) {
      throw new Error('No fields to update');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.update', {
      taskId,
      fields,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    return getTask(taskId);
  } catch (error: any) {
    console.error('Error updating task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to update task'
    );
  }
}

// Complete task
export async function completeTask(taskId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.complete', { taskId });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error completing task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to complete task'
    );
  }
}

// Start task
export async function startTask(taskId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.start', { taskId });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error starting task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to start task'
    );
  }
}

// Pause task
export async function pauseTask(taskId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.pause', { taskId });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error pausing task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to pause task'
    );
  }
}

// Delete task
export async function deleteTask(taskId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.delete', { taskId });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error deleting task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to delete task'
    );
  }
}

// Delegate task
export async function delegateTask(taskId: number, userId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.delegate', { taskId, userId });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error delegating task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to delegate task'
    );
  }
}

// Get Kanban stages
export async function getKanbanStages(groupId?: number): Promise<KanbanStage[]> {
  try {
    const payload: Record<string, any> = {};
    if (groupId) {
      payload.entityId = groupId;
    }
    
    // Direct Bitrix24 REST API call - Bitrix24 REST API uses task.stages.get (not tasks.stages.get)
    const response = await apiClient.post('/rest/task.stages.get', payload);
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const stages = Object.values(response.data.result || {}).map((stage: any) => ({
      id: parseInt(stage.ID),
      title: stage.TITLE,
      color: stage.COLOR || '#64748B',
      sort: parseInt(stage.SORT) || 0,
      systemType: stage.SYSTEM_TYPE,
    }));
    
    return stages.sort((a, b) => a.sort - b.sort);
  } catch (error: any) {
    console.error('Error fetching Kanban stages:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch Kanban stages'
    );
  }
}

// Move task to different stage (Kanban)
// Bitrix24 API uses task.stages.movetask (not tasks.stages.movetask)
export async function moveTaskToStage(taskId: number, stageId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    if (!stageId) {
      throw new Error('Stage ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/task.stages.movetask', {
      taskId,
      stageId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error moving task to stage:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to move task to stage'
    );
  }
}

// Attach file to task
export async function attachFileToTask(taskId: number, fileId: number): Promise<void> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    if (!fileId) {
      throw new Error('File ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.files.attach', {
      taskId,
      fileId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error attaching file to task:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to attach file to task'
    );
  }
}

// Get task comments
export async function getTaskComments(taskId: number): Promise<TaskComment[]> {
  try {
    if (!taskId) {
      throw new Error('Task ID is required');
    }
    
    // Direct Bitrix24 REST API call - Bitrix24 REST API uses task.commentitem.getlist
    const response = await apiClient.post('/rest/task.commentitem.getlist', {
      TASK_ID: taskId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const comments = (response.data.result || []).map((comment: any) => ({
      id: parseInt(comment.ID),
      taskId: parseInt(comment.TASK_ID),
      authorId: parseInt(comment.AUTHOR_ID),
      text: comment.POST_MESSAGE || '',
      date: comment.CREATED_DATE || comment.POST_DATE,
      files: comment.FILES?.map((file: any) => ({
        id: parseInt(file.ID || file.id),
        name: file.NAME || file.name || 'Unknown',
        size: parseInt(file.SIZE || file.size || '0'),
        type: file.TYPE || file.type || 'application/octet-stream',
        url: file.DOWNLOAD_URL || file.URL || file.url || '',
      })) || [],
    }));
    
    return comments.sort((a: TaskComment, b: TaskComment) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error: any) {
    console.error('Error fetching task comments:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch task comments'
    );
  }
}

// Add comment to task
export async function addTaskComment(data: TaskCommentFormData): Promise<TaskComment> {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    if (!data.text || !data.text.trim()) {
      throw new Error('Comment text cannot be empty');
    }
    
    const payload: any = {
      TASK_ID: data.taskId,
      POST_MESSAGE: data.text.trim(),
    };
    
    // Add files if provided
    if (data.files && data.files.length > 0) {
      payload.FILES = data.files;
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/tasks.task.comment.add', payload);
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const commentId = response.data.result?.ID || response.data.result;
    
    if (!commentId) {
      throw new Error('Failed to add comment: No comment ID returned');
    }
    
    // Fetch the newly created comment to return full details
    const comments = await getTaskComments(data.taskId);
    const newComment = comments.find(c => c.id === parseInt(String(commentId)));
    
    if (!newComment) {
      // Return a minimal comment object if we can't fetch it
      return {
        id: parseInt(String(commentId)),
        taskId: data.taskId,
        authorId: 0, // Will be updated by real-time sync
        text: data.text.trim(),
        date: new Date().toISOString(),
        files: [],
      };
    }
    
    return newComment;
  } catch (error: any) {
    console.error('Error adding task comment:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to add task comment'
    );
  }
}
