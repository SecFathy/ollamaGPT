export interface LlamaRequestOptions {
  model: string;
  prompt: string;
  stream?: boolean;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
}

export interface LlamaStreamResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface LlamaApiErrorResponse {
  error: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface ModelOption {
  id: string;
  name: string;
}
