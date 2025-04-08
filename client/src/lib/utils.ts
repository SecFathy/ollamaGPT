import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    month: 'short',
    day: 'numeric'
  });
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function generateConversationTitle(content: string): string {
  // Extract the first few words from the user's message to create a title
  const words = content.split(' ').filter(word => word.trim() !== '');
  const titleWords = words.slice(0, 5);
  let title = titleWords.join(' ');
  
  if (words.length > 5) {
    title += '...';
  }
  
  return title;
}

export function groupConversationsByDate(conversations: any[]) {
  const groups: Record<string, any[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 days': [],
    'Older': []
  };

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  conversations.forEach(conversation => {
    const conversationDate = new Date(conversation.createdAt);
    
    if (isSameDay(conversationDate, now)) {
      groups['Today'].push(conversation);
    } else if (isSameDay(conversationDate, yesterday)) {
      groups['Yesterday'].push(conversation);
    } else if (conversationDate >= lastWeek) {
      groups['Last 7 days'].push(conversation);
    } else {
      groups['Older'].push(conversation);
    }
  });

  return groups;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isCodeBlock(text: string): boolean {
  return text.includes('```');
}

export function parseCodeBlocks(content: string): { code: boolean; content: string }[] {
  const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g;
  const parts: { code: boolean; content: string; language?: string }[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        code: false,
        content: content.substring(lastIndex, match.index)
      });
    }
    
    // Add code block
    const language = match[1].trim();
    parts.push({
      code: true,
      content: match[2],
      language: language || 'plaintext'
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add any remaining text after the last code block
  if (lastIndex < content.length) {
    parts.push({
      code: false,
      content: content.substring(lastIndex)
    });
  }
  
  return parts;
}
