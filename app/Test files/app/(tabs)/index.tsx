import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useAuthStore, useTaskStore, useChatStore, useNotificationStore } from '@store';

const { width } = Dimensions.get('window');

// Quick action icons
const TaskIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={Colors.textInverse} strokeWidth={2} />
    <Path d="M9 12l2 2 4-4" stroke={Colors.textInverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatBubbleIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={Colors.textInverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={Colors.textInverse} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BellIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={Colors.textInverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={Colors.textInverse} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { tasks, fetchTasks, loading: tasksLoading } = useTaskStore();
  const { chats, fetchChats } = useChatStore();
  const { notifications, fetchNotifications, unreadCount } = useNotificationStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
  const completedToday = tasks.filter(t => {
    if (t.status !== 'COMPLETED' || !t.closedDate) return false;
    const today = new Date().toDateString();
    return new Date(t.closedDate).toDateString() === today;
  }).length;
  const unreadMessages = chats.reduce((acc, chat) => acc + chat.unreadCount, 0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchTasks(),
        fetchChats(),
        fetchNotifications(),
      ]);
    } catch (error: any) {
      console.error('Error loading home data:', error);
      // Errors are handled by individual stores
      throw error; // Re-throw to be caught by onRefresh
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (error: any) {
      console.error('Error refreshing home data:', error);
      // Errors are handled by individual stores
    } finally {
      setRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickActions = [
    { icon: <TaskIcon />, label: 'My Complaints', color: '#7CB342', onPress: () => navigation.navigate('Tasks' as never) },
    { icon: <ChatBubbleIcon />, label: 'Messages', color: '#F9A825', onPress: () => navigation.navigate('Chat' as never) },
    { icon: <BellIcon />, label: 'Alerts', color: '#43A047', onPress: () => navigation.navigate('Notifications' as never) },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#1B5E20', '#2E7D32']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.name}{user?.lastName ? ` ${user.lastName}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile' as never)}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] || 'U').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statNumber}>{activeTasks}</Text>
            <Text style={styles.statLabel}>Active Complaints</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statNumber}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Text style={styles.statNumber}>{unreadMessages}</Text>
            <Text style={styles.statLabel}>Unread Messages</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCard, { backgroundColor: action.color }]}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                {action.icon}
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Complaints */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Complaints</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {tasks.slice(0, 3).map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => navigation.navigate('TaskDetail' as never, { id: task.id.toString() } as never)}
            >
              <View style={styles.taskLeft}>
                <View style={[
                  styles.taskStatus,
                  task.status === 'COMPLETED' && styles.taskStatusCompleted,
                  task.status === 'IN_PROGRESS' && styles.taskStatusProgress,
                ]} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskDeadline}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.priorityBadge,
                task.priority === 'HIGH' && styles.priorityHigh,
                task.priority === 'LOW' && styles.priorityLow,
              ]}>
                <Text style={styles.priorityText}>{task.priority}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No complaints yet</Text>
              <Text style={styles.emptySubtext}>No complaints available</Text>
            </View>
          )}
        </View>

        {/* Recent Chats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Chat' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {chats.slice(0, 3).map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              onPress={() => navigation.navigate('ChatDetail' as never, { id: chat.id.toString() } as never)}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {(chat.name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {chat.lastMessage?.text || 'No messages'}
                </Text>
              </View>
              {chat.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {chats.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingBottom: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textInverse,
    marginTop: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
    marginTop: -40,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardPrimary: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  statCardAccent: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  statCardSecondary: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 44) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.taskTodo,
    marginRight: 12,
  },
  taskStatusCompleted: {
    backgroundColor: Colors.taskCompleted,
  },
  taskStatusProgress: {
    backgroundColor: Colors.taskInProgress,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  taskDeadline: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surfaceSecondary,
  },
  priorityHigh: {
    backgroundColor: Colors.error + '20',
  },
  priorityLow: {
    backgroundColor: Colors.success + '20',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chatPreview: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
