import { create } from 'zustand';
import { Task, KanbanStage, TaskState, TaskFormData, TaskComment, TaskCommentFormData } from '../types';
import * as taskApi from '../services/api/tasks';

interface TaskStore extends TaskState {
  comments: TaskComment[];
  fetchTasks: (filter?: Record<string, any>) => Promise<void>;
  fetchTask: (taskId: number) => Promise<void>;
  createTask: (data: TaskFormData) => Promise<Task | null>;
  updateTask: (taskId: number, data: Partial<TaskFormData>) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  completeTask: (taskId: number) => Promise<void>;
  startTask: (taskId: number) => Promise<void>;
  fetchStages: (groupId?: number) => Promise<void>;
  moveTaskToStage: (taskId: number, stageId: number) => Promise<void>;
  fetchComments: (taskId: number) => Promise<void>;
  addComment: (data: TaskCommentFormData) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  stages: [],
  comments: [],
  loading: false,
  error: null,
  selectedTask: null,

  fetchTasks: async (filter) => {
    set({ loading: true, error: null });
    try {
      const result = await taskApi.getTasks({ filter });
      set({ tasks: result.items, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch tasks', loading: false });
    }
  },

  fetchTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.getTask(taskId);
      set({ selectedTask: task, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch task', loading: false });
    }
  },

  createTask: async (data) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.createTask(data);
      set((state) => ({
        tasks: [task, ...state.tasks],
        loading: false,
      }));
      return task;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create task', loading: false });
      return null;
    }
  },

  updateTask: async (taskId, data) => {
    set({ loading: true, error: null });
    try {
      const updatedTask = await taskApi.updateTask(taskId, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
        selectedTask: state.selectedTask?.id === taskId ? updatedTask : state.selectedTask,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update task', loading: false });
    }
  },

  deleteTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      await taskApi.deleteTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
        selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete task', loading: false });
    }
  },

  completeTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      await taskApi.completeTask(taskId);
      // Refresh task to get latest data from API
      const updatedTask = await taskApi.getTask(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        ),
        selectedTask: state.selectedTask?.id === taskId ? updatedTask : state.selectedTask,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to complete task', loading: false });
    }
  },

  startTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      await taskApi.startTask(taskId);
      // Refresh task to get latest data from API
      const updatedTask = await taskApi.getTask(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        ),
        selectedTask: state.selectedTask?.id === taskId ? updatedTask : state.selectedTask,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to start task', loading: false });
    }
  },

  fetchStages: async (groupId) => {
    try {
      const stages = await taskApi.getKanbanStages(groupId);
      set({ stages });
    } catch (error: any) {
      console.error('Failed to fetch stages:', error);
    }
  },

  moveTaskToStage: async (taskId, stageId) => {
    set({ loading: true, error: null });
    try {
      await taskApi.moveTaskToStage(taskId, stageId);
      // Refresh task to get latest data from API (including status updates)
      const updatedTask = await taskApi.getTask(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        ),
        selectedTask: state.selectedTask?.id === taskId ? updatedTask : state.selectedTask,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to move task', loading: false });
    }
  },

  fetchComments: async (taskId) => {
    try {
      const comments = await taskApi.getTaskComments(taskId);
      set({ comments });
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
      set({ error: error.message || 'Failed to fetch comments' });
    }
  },

  addComment: async (data) => {
    set({ loading: true, error: null });
    try {
      const comment = await taskApi.addTaskComment(data);
      set((state) => ({
        comments: [...state.comments, comment],
        loading: false,
      }));
      // Refresh task to get updated file list if files were attached
      if (data.files && data.files.length > 0) {
        await get().fetchTask(data.taskId);
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to add comment', loading: false });
    }
  },

  setSelectedTask: (task) => set({ selectedTask: task }),
  clearError: () => set({ error: null }),
}));

export default useTaskStore;
