import { useRef, useEffect } from 'react';
import { ChatMessage } from './chat-message';
import { EmptyState } from './empty-state';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatContainerProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onExampleSelect: (example: string) => void;
}

export function ChatContainer({ messages, isStreaming, onExampleSelect }: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 bg-background"
    >
      {messages.length === 0 ? (
        <EmptyState onExampleSelect={onExampleSelect} />
      ) : (
        <div className="max-w-3xl mx-auto py-6 space-y-0 divide-y divide-border">
          {messages.map((message, index) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
