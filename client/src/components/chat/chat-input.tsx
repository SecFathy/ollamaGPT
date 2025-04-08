import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, StopCircle } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onCancel?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, onCancel, isGenerating, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || disabled) return;
    
    onSubmit(input);
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="relative flex items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about coding, development tools, or technical questions..."
            className="min-h-[52px] max-h-[200px] pr-12 resize-none"
            disabled={disabled}
          />
          <div className="absolute bottom-2 right-2 flex">
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onCancel}
                className="text-muted-foreground hover:text-destructive"
              >
                <StopCircle className="h-5 w-5" />
                <span className="sr-only">Stop generating</span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={!input.trim() || disabled}
                className="text-muted-foreground hover:text-primary"
              >
                <Send className="h-5 w-5" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          DeepSeek Coder can make mistakes. Consider checking important information.
        </p>
      </form>
    </div>
  );
}
