import { useEffect, useRef, useState, useCallback } from 'react';

export type WebSocketMessage = {
  type: string;
  payload: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, data]);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Error parsing message');
      }
    });

    // Connection closed
    socket.addEventListener('close', () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    });

    // Connection error
    socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
      setIsConnected(false);
    });

    // Clean up on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Send message function
  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);

  // Clear messages function
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    messages,
    error,
    sendMessage,
    clearMessages,
  };
}