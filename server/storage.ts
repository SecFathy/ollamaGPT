import { 
  users, type User, type InsertUser,
  conversations, type Conversation,
  messages, type Message,
  settings, type Setting, type InsertSetting,
  blockedKeywords, type BlockedKeyword, type InsertBlockedKeyword,
  models, type Model, type InsertModel
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Omit<User, 'id'>>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  updateUserUsage(userId: number): Promise<User | undefined>;
  
  // Conversation and message management
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  createConversation(data: { title: string; userId: number }): Promise<Conversation>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, data: { title: string }): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Message operations
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(data: { conversationId: number; role: string; content: string }): Promise<Message>;
  
  // Setting operations
  getSetting(key: string): Promise<Setting | undefined>;
  getSettingsByUserId(userId: number): Promise<Setting[]>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: number, data: { value: string }): Promise<Setting | undefined>;
  checkSetupCompleted(): Promise<boolean>;
  
  // Blocked keywords operations
  getAllBlockedKeywords(): Promise<BlockedKeyword[]>;
  createBlockedKeyword(data: InsertBlockedKeyword): Promise<BlockedKeyword>;
  deleteBlockedKeyword(id: number): Promise<boolean>;
  checkMessageAgainstBlockedKeywords(content: string): Promise<{ isBlocked: boolean, keyword?: string }>;
  
  // Model operations
  getAllModels(): Promise<Model[]>;
  getModelById(id: number): Promise<Model | undefined>;
  getModelByName(name: string): Promise<Model | undefined>;
  getDefaultModel(): Promise<Model | undefined>;
  createModel(data: InsertModel): Promise<Model>;
  updateModel(id: number, data: Partial<Omit<Model, 'id'>>): Promise<Model | undefined>;
  deleteModel(id: number): Promise<boolean>;
  setDefaultModel(id: number): Promise<Model | undefined>;
  
  // Debug operations
  debugGetAllUsers(): User[];
  
  // Authentication properties
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private settings: Map<number, Setting>;
  private blockedKeywords: Map<number, BlockedKeyword>;
  private models: Map<number, Model>;
  
  public sessionStore: session.Store;
  public currentUserId: number;
  public currentConversationId: number;
  public currentMessageId: number;
  public currentSettingId: number;
  public currentBlockedKeywordId: number;
  public currentModelId: number;
  
  // Debug method to get all users 
  debugGetAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.settings = new Map();
    this.blockedKeywords = new Map();
    this.models = new Map();
    
    this.currentUserId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    this.currentSettingId = 1;
    this.currentBlockedKeywordId = 1;
    this.currentModelId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Initialize with the default model
    this.createModel({
      name: "deepseek-coder-v2",
      displayName: "DeepSeek Coder v2",
      apiEndpoint: "http://13.40.186.0:11434/api/generate",
      isDefault: true,
      isActive: true,
      addedBy: null
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    
    // Make the first user an admin by default
    const isFirstUser = this.users.size === 0;
    
    const user: User = {
      ...insertUser,
      id,
      isAdmin: isFirstUser || (insertUser.isAdmin ?? false),
      isActive: insertUser.isActive ?? true,
      quota: insertUser.quota ?? 100,
      usageCount: 0,
      createdAt: now,
      lastLogin: null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async updateUserUsage(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser = {
      ...user,
      usageCount: user.usageCount + 1,
      lastLogin: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Conversation management
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];
    
    this.conversations.forEach((conversation) => {
      if (conversation.userId === userId) {
        userConversations.push(conversation);
      }
    });
    
    return userConversations.sort((a, b) => {
      // Sort by createdAt, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  async createConversation(data: { title: string; userId: number }): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    
    const conversation: Conversation = {
      id,
      title: data.title,
      userId: data.userId,
      createdAt: now
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async updateConversation(id: number, data: { title: string }): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    
    if (!conversation) {
      return undefined;
    }
    
    const updatedConversation = {
      ...conversation,
      title: data.title
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteConversation(id: number): Promise<boolean> {
    return this.conversations.delete(id);
  }
  
  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    const conversationMessages: Message[] = [];
    
    this.messages.forEach((message) => {
      if (message.conversationId === conversationId) {
        conversationMessages.push(message);
      }
    });
    
    return conversationMessages.sort((a, b) => {
      // Sort by createdAt, oldest first
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }
  
  async createMessage(data: { conversationId: number; role: string; content: string }): Promise<Message> {
    const id = this.currentMessageId++;
    const now = new Date();
    
    const message: Message = {
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      createdAt: now
    };
    
    this.messages.set(id, message);
    return message;
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(
      (setting) => setting.key === key
    );
  }

  async getSettingsByUserId(userId: number): Promise<Setting[]> {
    const userSettings: Setting[] = [];
    
    this.settings.forEach((setting) => {
      if (setting.userId === userId) {
        userSettings.push(setting);
      }
    });
    
    return userSettings;
  }

  async createSetting(insertSetting: InsertSetting): Promise<Setting> {
    const id = this.currentSettingId++;
    const now = new Date();
    
    // Ensure userId is never undefined
    const userId = insertSetting.userId ?? null;
    
    const setting: Setting = {
      id,
      key: insertSetting.key,
      value: insertSetting.value,
      userId,
      createdAt: now,
      updatedAt: now
    };
    
    this.settings.set(id, setting);
    return setting;
  }

  async updateSetting(id: number, data: { value: string }): Promise<Setting | undefined> {
    const setting = this.settings.get(id);
    
    if (!setting) {
      return undefined;
    }
    
    const updatedSetting = {
      ...setting,
      value: data.value,
      updatedAt: new Date()
    };
    
    this.settings.set(id, updatedSetting);
    return updatedSetting;
  }

  async checkSetupCompleted(): Promise<boolean> {
    // Check if there are any users in the system
    const hasUsers = this.users.size > 0;
    
    // Check if the required LLM settings exist
    const hasModelName = await this.getSetting('modelName');
    const hasOllamaUrl = await this.getSetting('ollamaUrl');
    
    return hasUsers && !!hasModelName && !!hasOllamaUrl;
  }
  
  // Blocked keywords operations
  async getAllBlockedKeywords(): Promise<BlockedKeyword[]> {
    return Array.from(this.blockedKeywords.values());
  }
  
  async createBlockedKeyword(data: InsertBlockedKeyword): Promise<BlockedKeyword> {
    const id = this.currentBlockedKeywordId++;
    const now = new Date();
    
    const blockedKeyword: BlockedKeyword = {
      id,
      keyword: data.keyword,
      createdAt: now,
      createdBy: data.createdBy || null // Convert undefined to null
    };
    
    this.blockedKeywords.set(id, blockedKeyword);
    return blockedKeyword;
  }
  
  async deleteBlockedKeyword(id: number): Promise<boolean> {
    return this.blockedKeywords.delete(id);
  }
  
  async checkMessageAgainstBlockedKeywords(content: string): Promise<{ isBlocked: boolean, keyword?: string }> {
    const lowerContent = content.toLowerCase();
    const blockedKeywords = await this.getAllBlockedKeywords();
    
    for (const blockedKeyword of blockedKeywords) {
      const keyword = blockedKeyword.keyword.toLowerCase();
      if (lowerContent.includes(keyword)) {
        return { isBlocked: true, keyword: blockedKeyword.keyword };
      }
    }
    
    return { isBlocked: false };
  }
  
  // Model operations
  async getAllModels(): Promise<Model[]> {
    return Array.from(this.models.values());
  }
  
  async getModelById(id: number): Promise<Model | undefined> {
    return this.models.get(id);
  }
  
  async getModelByName(name: string): Promise<Model | undefined> {
    return Array.from(this.models.values()).find(
      (model) => model.name === name
    );
  }
  
  async getDefaultModel(): Promise<Model | undefined> {
    return Array.from(this.models.values()).find(
      (model) => model.isDefault
    );
  }
  
  async createModel(data: InsertModel): Promise<Model> {
    const id = this.currentModelId++;
    const now = new Date();
    
    // If this is the first model, make it the default
    const isDefault = data.isDefault || this.models.size === 0;
    
    // If this model is set as default, ensure all other models are not default
    if (isDefault) {
      this.models.forEach((model) => {
        model.isDefault = false;
      });
    }
    
    const model: Model = {
      id,
      name: data.name,
      displayName: data.displayName,
      apiEndpoint: data.apiEndpoint,
      isDefault,
      isActive: data.isActive ?? true,
      createdAt: now,
      addedBy: data.addedBy || null // Convert undefined to null
    };
    
    this.models.set(id, model);
    return model;
  }
  
  async updateModel(id: number, data: Partial<Omit<Model, 'id'>>): Promise<Model | undefined> {
    const model = this.models.get(id);
    
    if (!model) {
      return undefined;
    }
    
    // If this model is being set as default, ensure all other models are not default
    if (data.isDefault) {
      this.models.forEach((otherModel) => {
        if (otherModel.id !== id) {
          otherModel.isDefault = false;
        }
      });
    }
    
    const updatedModel = { ...model, ...data };
    this.models.set(id, updatedModel);
    return updatedModel;
  }
  
  async deleteModel(id: number): Promise<boolean> {
    const model = this.models.get(id);
    
    // Can't delete the default model
    if (model && model.isDefault) {
      return false;
    }
    
    // Ensure there's at least one model left
    if (this.models.size <= 1) {
      return false;
    }
    
    return this.models.delete(id);
  }
  
  async setDefaultModel(id: number): Promise<Model | undefined> {
    const model = this.models.get(id);
    
    if (!model) {
      return undefined;
    }
    
    // Set all models to non-default
    this.models.forEach((otherModel) => {
      otherModel.isDefault = false;
    });
    
    // Set this model as default
    model.isDefault = true;
    return model;
  }
}

export const storage = new MemStorage();
