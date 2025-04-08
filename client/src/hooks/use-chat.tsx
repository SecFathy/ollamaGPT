import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './use-local-storage';
import { ChatMessage, ChatRole, Conversation, LlamaRequestOptions } from '@/lib/types';
import { generateCompletion, cancelGeneration } from '@/lib/streaming';
import { generateConversationTitle } from '@/lib/utils';
import { useWebSocket } from './use-websocket';
import { useAuth } from './use-auth';

// Add global WebSocket variable for persistent connection
declare global {
  interface Window {
    chatWebSocket?: WebSocket;
  }
}

interface UseChatOptions {
  apiUrl?: string;
  initialMessages?: ChatMessage[];
  initialConversations?: Conversation[];
}

export function useChat(options: UseChatOptions = {}) {
  // Get auth context for user ID
  const { user } = useAuth();
  
  // Get WebSocket utilities
  const { isConnected, sendMessage: sendWsMessage } = useWebSocket();
  
  // Current conversation state
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<string | null>(null);
  
  // WebSocket settings for streaming
  const [useWsForStreaming, setUseWsForStreaming] = useState(true);
  
  // Available models
  const [availableModels] = useState([
    { id: 'deepseek-coder-v2', name: 'deepseek-coder-v2' },
    { id: 'llama2-70b', name: 'llama2-70b' },
    { id: 'codellama-34b', name: 'codellama-34b' }
  ]);
  
  // Selected model
  const [selectedModel, setSelectedModel] = useLocalStorage<string>('selectedModel', 'deepseek-coder-v2');
  
  // Conversation management
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('conversations', []);
  const [currentConversationId, setCurrentConversationId] = useLocalStorage<string | null>('currentConversationId', null);
  
  // Theme
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('darkMode', false);
  
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Effect to update document theme when darkMode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Effect to synchronize messages with the current conversation
  useEffect(() => {
    if (currentConversationId) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation) {
        setMessages(conversation.messages);
      }
    }
  }, [currentConversationId, conversations]);
  
  // Effect to authenticate WebSocket connection with user ID
  useEffect(() => {
    if (isConnected && user?.id && useWsForStreaming) {
      // Set up WebSocket connection if needed
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      
      if (!window.chatWebSocket || window.chatWebSocket.readyState !== WebSocket.OPEN) {
        window.chatWebSocket = new WebSocket(wsUrl);
        
        window.chatWebSocket.onopen = () => {
          console.log('WebSocket connected, sending auth');
          window.chatWebSocket?.send(JSON.stringify({
            type: 'auth',
            payload: { userId: user.id }
          }));
        };
      } else {
        // If WebSocket already exists and is open, just send auth message
        console.log('WebSocket already connected, sending auth');
        window.chatWebSocket.send(JSON.stringify({
          type: 'auth',
          payload: { userId: user.id }
        }));
      }
    }
  }, [isConnected, user, useWsForStreaming]);
  
  // Effect to handle WebSocket messages for streaming
  useEffect(() => {
    // Only set up listener if we're using WebSockets and generating a response
    if (!useWsForStreaming || !isGenerating || !currentAssistantMessageId) {
      return;
    }
    
    // Handler for WebSocket messages
    const handleWsMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle streaming message chunks
        if (data.type === 'stream') {
          const chunkData = data.payload;
          if (chunkData.response) {
            // Update the streaming response
            setCurrentResponse(prev => prev + chunkData.response);
            
            // Update the assistant message in real-time
            setMessages(prev => 
              prev.map(m => 
                m.id === currentAssistantMessageId 
                  ? { ...m, content: (m.content || '') + chunkData.response } 
                  : m
              )
            );
          }
        }
        // Handle stream completion
        else if (data.type === 'streamEnd') {
          console.log('Stream completed via WebSocket');
        }
        // Handle stream errors
        else if (data.type === 'streamError') {
          console.error('Streaming error via WebSocket:', data.payload.error);
        }
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };
    
    // Add the message event listener to WebSocket
    if (window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
      window.chatWebSocket.addEventListener('message', handleWsMessage);
    }
    
    // Clean up
    return () => {
      if (window.chatWebSocket) {
        window.chatWebSocket.removeEventListener('message', handleWsMessage);
      }
    };
  }, [useWsForStreaming, isGenerating, currentAssistantMessageId, setCurrentResponse, setMessages]);
  
  // Function to toggle theme
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, [setIsDarkMode]);
  
  // Function to create a new conversation
  const newConversation = useCallback(() => {
    const newId = uuidv4();
    const newConversation: Conversation = {
      id: newId,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
    setMessages([]);
    setIsMobileSidebarOpen(false);
  }, [setConversations, setCurrentConversationId]);
  
  // Function to select a conversation
  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
    }
    setIsMobileSidebarOpen(false);
  }, [conversations, setCurrentConversationId]);
  
  // Function to clear all conversations
  const clearConversations = useCallback(() => {
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
    setIsMobileSidebarOpen(false);
  }, [setConversations, setCurrentConversationId]);
  
  // Function to update the current conversation
  const updateCurrentConversation = useCallback((newMessages: ChatMessage[]) => {
    if (currentConversationId) {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversationId
            ? { ...conv, messages: newMessages }
            : conv
        )
      );
    } else if (newMessages.length > 0) {
      // Create a new conversation if we don't have one yet
      const newId = uuidv4();
      const firstUserMessage = newMessages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? generateConversationTitle(firstUserMessage.content)
        : 'New conversation';
      
      const newConversation: Conversation = {
        id: newId,
        title,
        messages: newMessages,
        createdAt: Date.now()
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newId);
    }
  }, [currentConversationId, setConversations, setCurrentConversationId]);
  
  // Function to send a message to the AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
    
    setIsGenerating(true);
    
    try {
      // Create an empty assistant message that will be updated as the response comes in
      const assistantMessageId = uuidv4();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };
      
      setCurrentAssistantMessageId(assistantMessageId);
      setMessages([...newMessages, assistantMessage]);
      
      // Build the prompt by concatenating all previous messages
      // We can improve this later by including only the most recent messages if needed
      const prompt = newMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n') + '\n\nAssistant:';
      
      // Make sure WebSocket is authenticated for the user
      if (useWsForStreaming && user?.id && window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
        // Send authentication to ensure the connection is linked to this user
        window.chatWebSocket.send(JSON.stringify({ 
          type: 'auth', 
          payload: { userId: user.id }
        }));
      }
      
      // Send the request to the Llama API
      let completeResponse = '';
      
      await generateCompletion(
        {
          model: selectedModel,
          prompt,
          stream: true
        },
        (chunk) => {
          completeResponse += chunk;
          
          // If not using WebSocket or as a fallback, update directly
          if (!useWsForStreaming || !window.chatWebSocket || window.chatWebSocket.readyState !== WebSocket.OPEN) {
            setCurrentResponse(completeResponse);
            
            // Update the assistant message in real-time
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: completeResponse } 
                  : m
              )
            );
          }
          // Note: If using WebSocket, the updates come via the WebSocket message handler
        }
      );
      
      // Finalize the assistant message
      const finalMessages = messages
        .concat([userMessage])
        .concat([{
          id: assistantMessageId,
          role: 'assistant',
          content: completeResponse,
          timestamp: Date.now()
        }]);
      
      setMessages(finalMessages);
      updateCurrentConversation(finalMessages);
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
        timestamp: Date.now()
      };
      
      setMessages([...newMessages, errorMessage]);
      updateCurrentConversation([...newMessages, errorMessage]);
      
    } finally {
      setIsGenerating(false);
      setCurrentResponse('');
      setCurrentAssistantMessageId(null);
    }
  }, [messages, isGenerating, selectedModel, updateCurrentConversation, useWsForStreaming, user]);
  
  // Function to stop generation
  const stopGeneration = useCallback(async () => {
    try {
      await cancelGeneration();
    } catch (error) {
      console.error('Error cancelling generation:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  return {
    // Messages and generation state
    messages,
    isGenerating,
    
    // Message actions
    sendMessage,
    stopGeneration,
    
    // Models
    availableModels,
    selectedModel,
    setSelectedModel,
    
    // Conversation management
    conversations,
    currentConversationId,
    newConversation,
    selectConversation,
    clearConversations,
    
    // Theme
    isDarkMode,
    toggleTheme,
    
    // Mobile sidebar
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    
    // WebSocket streaming settings
    useWsForStreaming,
    setUseWsForStreaming
  };
}
