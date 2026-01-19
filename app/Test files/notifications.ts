import axios from 'axios';
import { Notification, NotificationType, PaginatedResponse } from '../../types';
import apiClient from './client';

// Map Bitrix notification type to our type
const mapNotificationType = (type: string): NotificationType => {
  if (type.includes('task')) return 'task';
  if (type.includes('im') || type.includes('chat')) return 'message';
  if (type.includes('mention')) return 'mention';
  return 'system';
};

// Get notifications
export async function getNotifications(params?: {
  limit?: number;
  lastId?: number;
}): Promise<PaginatedResponse<Notification>> {
  try {
    // Backend proxies Bitrix API calls
    const response = await apiClient.get('/im.notify.get', {
      params: {
        LIMIT: params?.limit || 20,
        LAST_ID: params?.lastId,
      },
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    const notifications = (response.data.result.notifications || []).map((notif: any) => ({
    id: parseInt(notif.id),
    type: mapNotificationType(notif.type || ''),
    title: notif.title || 'Notification',
    text: notif.text,
    date: notif.date,
    isRead: notif.read === 'Y',
    senderId: notif.from ? parseInt(notif.from) : undefined,
  }));
  
    return {
      items: notifications,
      total: response.data.total || notifications.length,
      hasMore: notifications.length >= (params?.limit || 20),
    };
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to fetch notifications'
    );
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.notify.read', {
      ID: notificationId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to mark notification as read'
    );
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.notify.read.all');
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to mark all notifications as read'
    );
  }
}

// Delete notification
export async function deleteNotification(notificationId: number): Promise<void> {
  try {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.notify.delete', {
      ID: notificationId,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to delete notification'
    );
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    // Direct Bitrix24 REST API call
    const response = await apiClient.get('/rest/im.counters.get');
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
    
    return response.data.result?.NOTIFY || 0;
  } catch (error: any) {
    console.error('Error fetching unread notification count:', error);
    // Return 0 on error to prevent UI issues
    return 0;
  }
}

// Send personal notification (for testing/admin)
export async function sendPersonalNotification(userId: number, message: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.notify.personal.add', {
      USER_ID: userId,
      MESSAGE: message,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error sending personal notification:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to send personal notification'
    );
  }
}

// Send system notification (for testing/admin)
export async function sendSystemNotification(userId: number, message: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/im.notify.system.add', {
      USER_ID: userId,
      MESSAGE: message,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error sending system notification:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to send system notification'
    );
  }
}

// Send push notification to mobile device
// This triggers a push notification on the user's mobile device via Bitrix24
export async function sendPushNotification(
  userId: number,
  message: string,
  params?: {
    title?: string;
    sound?: string;
    badge?: number;
  }
): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/pull.application.push.add', {
      USER_ID: userId,
      MESSAGE: message,
      TITLE: params?.title || 'JBmarks',
      SOUND: params?.sound || 'default',
      BADGE: params?.badge,
    });
    
    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    throw new Error(
      error.response?.data?.error_description ||
      error.message ||
      'Failed to send push notification'
    );
  }
}

