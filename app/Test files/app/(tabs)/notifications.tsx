import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useNotificationStore } from '@store';
import { Notification, NotificationType } from '@types';
import { LoadingSpinner } from '@components/common';

const TaskIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MentionIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2} />
    <Path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SystemIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckAllIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 7l-8.5 8.5-4-4M22 7l-8.5 8.5M4 12l3.5 3.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function NotificationsScreen() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, loading, unreadCount } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error refreshing notifications:', error);
      // Error is handled by the store
    } finally {
      setRefreshing(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconColor = Colors.textInverse;
    switch (type) {
      case 'task':
        return <TaskIcon color={iconColor} />;
      case 'message':
        return <ChatIcon color={iconColor} />;
      case 'mention':
        return <MentionIcon color={iconColor} />;
      default:
        return <SystemIcon color={iconColor} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'task':
        return Colors.primary;
      case 'message':
        return Colors.accent;
      case 'mention':
        return Colors.secondary;
      default:
        return Colors.textSecondary;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.link) {
      if (notification.link.type === 'task') {
        navigation.navigate('TaskDetail' as never, { id: notification.link.id.toString() } as never);
      } else if (notification.link.type === 'chat') {
        navigation.navigate('ChatDetail' as never, { id: notification.link.id.toString() } as never);
      }
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.notificationUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
        {getNotificationIcon(item.type)}
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.date)}</Text>
        </View>
        <Text style={styles.notificationText} numberOfLines={2}>{item.text}</Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return <LoadingSpinner fullScreen message="Loading notifications..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <CheckAllIcon />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <SystemIcon color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              You're all caught up!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  unreadCountText: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationUnread: {
    backgroundColor: Colors.accent + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  notificationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
