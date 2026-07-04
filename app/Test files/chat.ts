import axios from 'axios';
import { Chat, Message, MessageFormData, BitrixResponse, PaginatedResponse } from '../../types';
import apiClient from './client';

// Get recent chats
export async function getRecentChats(): Promise<Chat[]> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/im.recent.list');
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const chats = (response.data.result.items || []).map((item: any) => {
    // Preserve original dialog ID format from Bitrix24
    const dialogId = item.id; // Can be "chat123", "user456", or number
    let numericId: number | string = dialogId;
    
    // Try to extract numeric ID from string format
    if (typeof dialogId === 'string') {
      if (dialogId.startsWith('chat')) {
        numericId = parseInt(dialogId.replace('chat', '')) || dialogId;
      } else if (dialogId.startsWith('user')) {
        numericId = parseInt(dialogId.replace('user', '')) || dialogId;
      } else {
        // Try to parse as number, fallback to string
        const parsed = parseInt(dialogId);
        numericId = isNaN(parsed) ? dialogId : parsed;
      }
    }
    
    return {
      id: numericId, // Use numeric ID for internal state (or original if can't parse)
      dialogId: dialogId, // Preserve original format for API calls
      type: item.type === 'user' ? 'private' : item.type === 'chat' ? 'group' : 'open',
      name: item.title || item.name,
      avatar: item.avatar?.url,
      lastMessage: item.message ? {
        id: item.message.id,
        chatId: numericId,
        senderId: item.message.senderId,
        text: item.message.text,
        date: item.message.date,
        isRead: !item.counter,
      } : undefined,
      unreadCount: item.counter || 0,
      dateLastMessage: item.message?.date,
    };
  });
  
    return chats;
  } catch (error: any) {
    console.error('Error fetching recent chats:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch chats'
    );
  }
}

// Get chat messages
export async function getChatMessages(
  dialogId: string | number,
  params?: { limit?: number; lastId?: number }
): Promise<PaginatedResponse<Message>> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/im.dialog.messages.get', {
      params: {
        DIALOG_ID: dialogId,
        LIMIT: params?.limit || 20,
        LAST_ID: params?.lastId,
      },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const messages = (response.data.result.messages || []).map((msg: any) => {
    // Convert dialogId to consistent format for chatId
    // Preserve original dialogId format if it's a string, otherwise use numeric value
    let chatId: number | string = dialogId;
    if (typeof dialogId === 'string') {
      // Try to extract numeric ID, but preserve string format if parsing fails
      if (dialogId.startsWith('chat')) {
        const parsed = parseInt(dialogId.replace('chat', ''));
        chatId = isNaN(parsed) ? dialogId : parsed;
      } else if (dialogId.startsWith('user')) {
        const parsed = parseInt(dialogId.replace('user', ''));
        chatId = isNaN(parsed) ? dialogId : parsed;
      } else {
        const parsed = parseInt(dialogId);
        chatId = isNaN(parsed) ? dialogId : parsed;
      }
    }
    
    return {
      id: parseInt(msg.id),
      chatId,
      senderId: parseInt(msg.author_id),
      text: msg.text,
      date: msg.date,
      isRead: msg.unread !== 'Y',
      files: msg.files?.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.urlDownload,
        preview: file.urlPreview,
      })),
    };
  });
  
    return {
      items: messages.reverse(), // Bitrix returns newest first, we want oldest first
      total: response.data.total || messages.length,
      hasMore: messages.length >= (params?.limit || 20),
    };
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch messages'
    );
  }
}

// Send message
export async function sendMessage(data: MessageFormData): Promise<Message> {
  try {
    if (!data.text || !data.text.trim()) {
      throw new Error('Message text cannot be empty');
    }
    
    // Use dialogId if provided, otherwise use chatId
    const dialogId = (data as any).dialogId || data.chatId;
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.message.add', {
      DIALOG_ID: dialogId,
      MESSAGE: data.text,
      ATTACH: data.files,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const messageId = response.data.result;
    
    if (!messageId) {
      throw new Error('Failed to send message: No message ID returned');
    }
    
    // Return a minimal message object
    // Preserve chatId format from data (could be number or string)
    const chatId = data.chatId; // Keep original format for consistency
    
    return {
      id: messageId,
      chatId,
      senderId: 0, // Will be updated by real-time sync
      text: data.text,
      date: new Date().toISOString(),
      isRead: true,
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to send message'
    );
  }
}

// Create new chat
export async function createChat(params: {
  type: 'private' | 'group';
  title?: string;
  userIds: number[];
}): Promise<Chat> {
  try {
    if (!params.userIds || params.userIds.length === 0) {
      throw new Error('At least one user ID is required');
    }
    
    if (params.type === 'private' && params.userIds.length === 1) {
      // For private chats, we just start a dialog
      return {
        id: params.userIds[0],
        dialogId: params.userIds[0].toString(),
        type: 'private',
        name: '', // Will be populated by the UI
        unreadCount: 0,
      };
    }
    
    // Direct Bitrix24 REST API call
    // Create group chat
    const response = await apiClient.post('/rest/im.chat.add', {
      TYPE: params.type === 'group' ? 'CHAT' : 'OPEN',
      TITLE: params.title,
      USERS: params.userIds,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const chatId = response.data.result;
    
    if (!chatId) {
      throw new Error('Failed to create chat: No chat ID returned');
    }
    
    return {
      id: chatId,
      dialogId: `chat${chatId}`,
      type: params.type,
      name: params.title || 'New Chat',
      unreadCount: 0,
    };
  } catch (error: any) {
    console.error('Error creating chat:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to create chat'
    );
  }
}

// Get chat info
export async function getChat(dialogId: string | number): Promise<Chat> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/im.dialog.get', {
      params: { DIALOG_ID: dialogId },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const chat = response.data.result;
    
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    return {
      id: typeof dialogId === 'string' ? parseInt(dialogId.replace('chat', '')) : dialogId,
      type: chat.type === 'private' ? 'private' : 'group',
      name: chat.title || chat.name,
      avatar: chat.avatar,
      unreadCount: chat.counter || 0,
    };
  } catch (error: any) {
    console.error('Error fetching chat info:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch chat info'
    );
  }
}

// Mark messages as read
export async function markMessagesAsRead(dialogId: string | number, messageId?: number): Promise<void> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.dialog.read', {
      DIALOG_ID: dialogId,
      MESSAGE_ID: messageId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to mark messages as read'
    );
  }
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/im.counters.get');
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    return response.data.result?.CHAT || 0;
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    // Return 0 on error to prevent UI issues
    return 0;
  }
}

