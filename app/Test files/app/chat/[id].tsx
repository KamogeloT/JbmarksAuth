import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useChatStore, useAuthStore } from '@store';
import { Message } from '@types';
import { LoadingSpinner } from '@components/common';

const BackIcon = ({ color = Colors.textPrimary }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SendIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = (route.params as { id?: string }) || {};
  const { user } = useAuthStore();
  const { chats, messages, fetchMessages, sendMessage, markAsRead, loading } = useChatStore();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Find chat by ID (can be number or string)
  const chatId = id ? (isNaN(Number(id)) ? id : parseInt(id)) : null;
  const chat = chats.find(c => c.id === chatId || c.dialogId === chatId || String(c.id) === id || String(c.dialogId) === id);
  const chatMessages = chatId ? (messages[chatId] || messages[String(chatId)] || []) : [];

  useEffect(() => {
    if (id && chat) {
      // Use the chat's dialogId if available, otherwise use the id from route
      const chatIdToUse = chat.dialogId || (isNaN(Number(id)) ? id : parseInt(id));
      fetchMessages(chatIdToUse);
      markAsRead(chatIdToUse);
    }
  }, [id, chat, fetchMessages, markAsRead]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!messageText.trim() || !id || !chat) return;

    try {
      // Use the chat's dialogId if available, otherwise use the id from route
      const chatIdToUse = chat.dialogId || (isNaN(Number(id)) ? id : parseInt(id));
      
      await sendMessage({
        chatId: chat.id, // Use numeric ID for state management
        dialogId: chatIdToUse, // Use original dialog ID for API call
        text: messageText.trim(),
      });
      setMessageText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Error is already handled by the store, but we can show a toast here if needed
      // The store's error state will be displayed in the UI
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    
    return (
      <View style={[styles.messageContainer, isOwn && styles.messageContainerOwn]}>
        <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {formatTime(item.date)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && chatMessages.length === 0) {
    return <LoadingSpinner fullScreen message="Loading messages..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chat?.name || 'Chat'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <SendIcon />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: Colors.textInverse,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: Colors.textInverse,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
