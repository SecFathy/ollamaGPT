import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced User model with role and usage information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  quota: integer("quota").default(100).notNull(), // Default quota of 100 requests
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
  isActive: true,
  quota: true,
});

// Blocked keywords for content moderation
export const blockedKeywords = pgTable("blocked_keywords", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

export const insertBlockedKeywordSchema = createInsertSchema(blockedKeywords).pick({
  keyword: true,
  createdBy: true,
});

// Available models configuration
export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Technical model name (e.g., "deepseek-coder-v2")
  displayName: text("display_name").notNull(), // Human-readable name (e.g., "DeepSeek Coder v2")
  apiEndpoint: text("api_endpoint").notNull(), // API endpoint URL
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  addedBy: integer("added_by").references(() => users.id),
});

export const insertModelSchema = createInsertSchema(models).pick({
  name: true,
  displayName: true,
  apiEndpoint: true,
  isDefault: true,
  isActive: true,
  addedBy: true,
});

// System settings table for LLM and application configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  userId: true,
});

// Chat related schemas
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  userId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBlockedKeyword = z.infer<typeof insertBlockedKeywordSchema>;
export type BlockedKeyword = typeof blockedKeywords.$inferSelect;

export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof models.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Chat schemas for client-side use
export const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatConversationSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  messages: z.array(chatMessageSchema),
  createdAt: z.number().optional(),
});

export type ChatConversation = z.infer<typeof chatConversationSchema>;

// LLM Setup schemas
export const llmSetupSchema = z.object({
  appName: z.string().min(2, "Application name must be at least 2 characters"),
  modelName: z.string().min(3, "Model name must be at least 3 characters"),
  ollamaUrl: z.string().url("Must be a valid URL"),
  modelDisplayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export type LlmSetup = z.infer<typeof llmSetupSchema>;