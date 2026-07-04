import { create } from 'zustand';
import { Notification, NotificationState } from '../types';
import * as notificationApi from '../services/api/notifications';

interface NotificationStore extends NotificationState {
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const result = await notificationApi.getNotifications();
      const unreadCount = result.items.filter((n) => !n.isRead).length;
      set({
        notifications: result.items,
        unreadCount,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch notifications', loading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await notificationApi.markNotificationAsRead(notificationId);
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return { notifications, unreadCount };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark all as read' });
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      set((state) => {
        const notifications = state.notifications.filter((n) => n.id !== notificationId);
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        return { notifications, unreadCount };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete notification' });
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    }));
  },

  clearError: () => set({ error: null }),
}));

export default useNotificationStore;

