import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useNotificationStore, useChatStore } from '@store';
import HomeScreen from './index';
import TasksScreen from './tasks';
import ChatScreen from './chat';
import NotificationsScreen from './notifications';
import ProfileScreen from './profile';

const Tab = createBottomTabNavigator();

// Custom Tab Icons
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TasksIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BellIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
  </Svg>
);

export default function TabLayout() {
  const { unreadCount } = useNotificationStore();
  const { chats } = useChatStore();
  const unreadMessages = chats.reduce((acc, chat) => acc + chat.unreadCount, 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Complaints',
          tabBarIcon: ({ color, size }) => <TasksIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ChatIcon color={color} size={size} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <View>
              <BellIcon color={color} size={size} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});
