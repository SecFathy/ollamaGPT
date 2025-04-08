import React, { useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { cn, parseCodeBlocks } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CodeBlock } from '@/components/ui/code-block';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [parts, setParts] = useState<{ code: boolean; content: string; language?: string }[]>([]);

  useEffect(() => {
    setParts(parseCodeBlocks(message.content));
  }, [message.content]);

  return (
    <div className={cn(
      'flex items-start gap-4 py-6',
      message.role === 'user' ? 'bg-transparent' : 'bg-muted/30',
      isStreaming && 'animate-pulse'
    )}>
      <Avatar className="flex-shrink-0 mt-1">
        {message.role === 'user' ? (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1 overflow-hidden space-y-2 markdown">
        {parts.map((part, index) => (
          <div key={index}>
            {part.code ? (
              <CodeBlock 
                language={part.language || 'plaintext'} 
                content={part.content} 
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                {part.content.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < part.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
                {isStreaming && parts.length - 1 === index && (
                  <span className="cursor-blink">▌</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
