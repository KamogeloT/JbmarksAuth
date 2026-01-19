import { create } from 'zustand';
import { Chat, Message, ChatState, MessageFormData } from '../types';
import * as chatApi from '../services/api/chat';

interface ChatStore extends ChatState {
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: number | string, lastId?: number) => Promise<void>;
  sendMessage: (data: MessageFormData) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  addMessage: (chatId: number | string, message: Message) => void;
  markAsRead: (chatId: number | string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  chats: [],
  messages: {},
  activeChat: null,
  loading: false,
  error: null,

  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const chats = await chatApi.getRecentChats();
      set({ chats, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch chats', loading: false });
    }
  },

  fetchMessages: async (chatId, lastId) => {
    set({ loading: true, error: null });
    try {
      // Get the original dialog ID from the chat object
      const chat = get().chats.find(c => c.id === chatId || c.dialogId === chatId);
      const dialogId = chat?.dialogId || chatId;
      
      const result = await chatApi.getChatMessages(dialogId, { lastId });
      set((state) => {
        const existingMessages = state.messages[chatId] || [];
        const newMessages = lastId
          ? [...result.items, ...existingMessages]
          : result.items;
        
        // Remove duplicates
        const uniqueMessages = newMessages.filter(
          (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
        );
        
        return {
          messages: {
            ...state.messages,
            [chatId]: uniqueMessages,
          },
          loading: false,
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch messages', loading: false });
    }
  },

  sendMessage: async (data) => {
    set({ loading: true, error: null });
    try {
      const chat = get().chats.find(c => c.id === data.chatId || c.dialogId === data.chatId);
      const dialogId = chat?.dialogId || data.chatId;

      const message = await chatApi.sendMessage({
        ...data,
        dialogId: dialogId,
      });
      
      // Optimistically add message to state
      set((state) => {
        const chatMessages = state.messages[data.chatId] || [];
        return {
          messages: {
            ...state.messages,
            [data.chatId]: [...chatMessages, message],
          },
          loading: false,
        };
      });
      
      // Update last message in chat list
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === data.chatId || chat.dialogId === data.chatId
            ? { ...chat, lastMessage: message, dateLastMessage: message.date }
            : chat
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to send message', loading: false });
    }
  },

  setActiveChat: (chat) => set({ activeChat: chat }),

  addMessage: (chatId, message) => {
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      // Check if message already exists
      if (chatMessages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, message],
        },
      };
    });
  },

  markAsRead: async (chatId) => {
    try {
      // Get the original dialog ID from the chat object
      const chat = get().chats.find(c => c.id === chatId || c.dialogId === chatId);
      const dialogId = chat?.dialogId || chatId;
      
      await chatApi.markMessagesAsRead(dialogId);
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId || chat.dialogId === chatId ? { ...chat, unreadCount: 0 } : chat
        ),
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) => ({ ...m, isRead: true })),
        },
      }));
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
    }
  },

  clearError: () => set({ error: null }),
}));

export default useChatStore;
