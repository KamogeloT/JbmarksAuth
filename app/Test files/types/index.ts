// JBmarks Type Definitions

// User Types
export interface User {
  id: number;
  name: string;
  lastName?: string;
  email: string;
  workPosition?: string;
  personalPhoto?: string;
  personalMobile?: string;
  active: boolean;
  login?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

// Task Types
export type TaskStatus = 'NEW' | 'PENDING' | 'IN_PROGRESS' | 'SUPPOSEDLY_COMPLETED' | 'COMPLETED' | 'DEFERRED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: number;
  responsibleId: number;
  createdDate: string;
  deadline?: string;
  closedDate?: string;
  stageId?: number;
  groupId?: number;
  tags?: string[];
  checklist?: ChecklistItem[];
  files?: TaskFile[];
  responsible?: User;
  creator?: User;
}

export interface ChecklistItem {
  id: number;
  title: string;
  isComplete: boolean;
  sortIndex: number;
}

export interface TaskFile {
  id: number;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  authorId: number;
  text: string;
  date: string;
  files?: TaskFile[];
  author?: User;
}

export interface TaskCommentFormData {
  taskId: number;
  text: string;
  files?: number[]; // Array of file IDs
}

export interface KanbanStage {
  id: number;
  title: string;
  color: string;
  sort: number;
  systemType?: string;
}

export interface TaskState {
  tasks: Task[];
  stages: KanbanStage[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
}

// Chat/Message Types
export interface Chat {
  id: number | string; // Can be number or string (e.g., "chat123", "user456")
  type: 'private' | 'group' | 'open';
  name: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  dateLastMessage?: string;
  users?: User[];
  dialogId?: string | number; // Original Bitrix24 dialog ID format
}

export interface Message {
  id: number;
  chatId: number | string; // Can be number or string to support Bitrix24 dialog IDs
  senderId: number;
  text: string;
  date: string;
  isRead: boolean;
  files?: MessageFile[];
  sender?: User;
}

export interface MessageFile {
  id: number;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

export interface ChatState {
  chats: Chat[];
  messages: Record<number | string, Message[]>;
  activeChat: Chat | null;
  loading: boolean;
  error: string | null;
}

// Notification Types
export type NotificationType = 'task' | 'message' | 'system' | 'mention';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  text: string;
  date: string;
  isRead: boolean;
  senderId?: number;
  sender?: User;
  link?: {
    type: 'task' | 'chat' | 'user';
    id: number;
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// API Response Types
export interface BitrixResponse<T> {
  result: T;
  error?: string;
  error_description?: string;
  total?: number;
  next?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  next?: number;
}

// Form Types
export interface TaskFormData {
  title: string;
  description?: string;
  responsibleId?: number;
  deadline?: string;
  priority?: TaskPriority;
  groupId?: number;
  tags?: string[];
}

export interface MessageFormData {
  chatId: number | string; // Can be number or dialog ID string
  text: string;
  files?: string[]; // File IDs
  dialogId?: string | number; // Original Bitrix24 dialog ID (optional, falls back to chatId)
}

// Navigation Types
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'task/[id]': { id: string };
  'chat/[id]': { id: string };
};

