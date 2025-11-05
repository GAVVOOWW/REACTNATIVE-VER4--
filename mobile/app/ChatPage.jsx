"use client"

import React, { useState, useEffect, useRef } from "react"
import { API_BASE_URL } from "@env";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { socket } from '../utils/socket'

const ChatPage = () => {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState(null)
  const [chatId, setChatId] = useState(null)
  const flatListRef = useRef()
  const lastSendTimeRef = useRef(0)

 

  // Effect for initializing and cleaning up socket connection using singleton pattern
  useEffect(() => {
    if (!socket) return;

    // Connect the singleton socket if it's not already connected
    if (!socket.connected) {
      socket.connect()
      console.log('Socket connected for ChatPage')
    }

    const handleReceiveMessage = (message) => {
      if (message.chatId === chatId) {
        setMessages(prev => {
          // Remove any optimistic messages with the same content from the same sender
          const filteredMessages = prev.filter(msg =>
            !(msg.isOptimistic &&
              msg.content === message.content &&
              msg.sender?.role === message.sender?.role)
          );

          // Check for duplicates more robustly
          const exists = filteredMessages.some(msg =>
            msg._id === message._id ||
            (msg.content === message.content &&
              msg.sender?._id === message.sender?._id &&
              Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)
          );

          if (exists) {
            console.log('Duplicate message detected and prevented:', message);
            return filteredMessages;
          }

          return [...filteredMessages, message];
        });
      }
    };

    const handleMessageSent = () => setSending(false);

    const handleMessageError = (error) => {
      console.error('Message error:', error);
      setSending(false);
      Alert.alert('Error', error.error || 'Failed to send message');
    };

    // Attach listeners
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageSent', handleMessageSent);
    socket.on('messageError', handleMessageError);

    return () => {
      // Important: clean up listeners when component unmounts
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageSent', handleMessageSent);
      socket.off('messageError', handleMessageError);
    }
  }, [chatId]) // Re-run if chatId changes, though it shouldn't often

  // Effect to scroll to the bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  useEffect(() => {
    getUserId()
  }, [])

  useEffect(() => {
    if (userId) {
      getOrCreateChat()
    }
  }, [userId])

  // Effect for joining chat room once we have a chatId
  useEffect(() => {
    if (socket && chatId) {
      socket.emit('joinChat', chatId)
      console.log('Joined chat room:', chatId)
    }
  }, [chatId])

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token')
    } catch (error) {
      console.error("Error getting auth token:", error)
      return null
    }
  }

  const getUserId = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId')
      if (storedUserId) {
        setUserId(storedUserId)
      } else {
        Alert.alert("Error", "Please login first to chat.", [
          { text: "OK", onPress: () => router.push("/Login") }
        ])
      }
    } catch (error) {
      console.error("Error getting user ID:", error)
    }
  }

  const getOrCreateChat = async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      if (!token) {
        Alert.alert("Authentication Error", "Please login to access chat.", [
          { text: "OK", onPress: () => router.push("/Login") }
        ])
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.msg || "Failed to initialize chat.")
      }

      const chat = await response.json()
      setMessages(chat.messages || [])
      setChatId(chat._id)
    } catch (error) {
      console.error("Error getting or creating chat:", error)
      Alert.alert("Error", error.message || "Could not load chat history.")
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !socket) return;

    // Prevent rapid-fire sending (debounce)
    const now = Date.now();
    if (now - lastSendTimeRef.current < 500) { // 500ms debounce
      console.log('Message sending debounced');
      return;
    }
    lastSendTimeRef.current = now;

    const messageText = newMessage.trim();
    setSending(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage = {
      _id: tempId,
      content: messageText,
      sender: { _id: userId, name: 'You', role: 'user' },
      timestamp: new Date().toISOString(),
      isOptimistic: true, // Flag to identify optimistic messages
    };

    setNewMessage('');
    setMessages(prev => {
      // Check if this exact message already exists
      const duplicate = prev.some(msg =>
        msg.content === messageText &&
        msg.sender?.role === 'user' &&
        Math.abs(new Date(msg.timestamp) - new Date()) < 2000 // Within 2 seconds
      );
      if (duplicate) {
        console.log('Duplicate optimistic message prevented');
        return prev;
      }
      return [...prev, optimisticMessage];
    });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    // Emit message through socket
    socket.emit('sendMessage', {
      chatId: chatId,
      senderId: userId,
      content: messageText
    });
  }

  const renderMessageItem = React.useCallback(({ item }) => {
    const isMyMessage = item.sender._id === userId
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        {!isMyMessage && <Text style={styles.senderName}>{item.sender.name || 'Support'}</Text>}
        <Text style={[styles.messageText, isMyMessage && { color: '#FFFFFF' }]}>{item.content || item.message}</Text>
        <View style={styles.messageInfo}>
          <Text style={[styles.timestamp, isMyMessage && { color: '#E3F2FD' }]}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          {isMyMessage && item.status && (
            <Icon
              name={item.status === 'sending' ? 'schedule' : item.status === 'failed' ? 'error' : 'check'}
              size={12}
              color={item.status === 'failed' ? '#EF4444' : '#9CA3AF'}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    )
  }, [userId])

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563EB" />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id || `msg_${item.timestamp}`}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (sending || newMessage.trim() === '') && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || newMessage.trim() === ''}
          >
            <Icon name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 24,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#2563EB',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
})

export default ChatPage
