import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useChatStore } from '@store';
import { Chat } from '@types';
import { LoadingSpinner } from '@components/common';

const SearchIcon = ({ color = Colors.textMuted }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export default function ChatScreen() {
  const { chats, fetchChats, loading } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchChats();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchChats();
    } catch (error: any) {
      console.error('Error refreshing chats:', error);
      // Error is handled by the store
    } finally {
      setRefreshing(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
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

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => navigation.navigate('ChatDetail' as never, { id: item.id.toString() } as never)}
      activeOpacity={0.7}
    >
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>
          {(item.name?.[0] || '?').toUpperCase()}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          {item.dateLastMessage && (
            <Text style={styles.chatTime}>{formatTime(item.dateLastMessage)}</Text>
          )}
        </View>
        <Text style={styles.chatPreview} numberOfLines={1}>
          {item.lastMessage?.text || 'No messages yet'}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && chats.length === 0) {
    return <LoadingSpinner fullScreen message="Loading chats..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conversations</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chatPreview: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
