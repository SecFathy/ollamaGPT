import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";

// Default API URL (will be overridden by settings)
let LLAMA_API_URL = "http://13.40.186.0:11434/api/generate";
let APP_NAME = "DeepSeek Coder";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Initialize settings from database
  const appNameSetting = await storage.getSetting('appName');
  if (appNameSetting) {
    APP_NAME = appNameSetting.value;
  }
  
  const ollamaUrlSetting = await storage.getSetting('ollamaUrl');
  if (ollamaUrlSetting) {
    LLAMA_API_URL = ollamaUrlSetting.value;
  }

  // Setup status endpoint - check if setup is completed
  app.get("/api/setup/status", async (req, res) => {
    try {
      const isSetupCompleted = await storage.checkSetupCompleted();
      res.json({ isCompleted: isSetupCompleted });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ error: "Failed to check setup status" });
    }
  });
  
  // Get application info
  app.get("/api/app-info", async (req, res) => {
    try {
      const appNameSetting = await storage.getSetting('appName');
      res.json({ 
        appName: appNameSetting?.value || APP_NAME
      });
    } catch (error) {
      console.error("Error fetching app info:", error);
      res.status(500).json({ error: "Failed to fetch app info" });
    }
  });
  
  // API route to get detailed user profile information
  app.get("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create a profile object without the sensitive data
      const profile = {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        quota: user.quota,
        usageCount: user.usageCount,
        usagePercentage: user.quota > 0 ? Math.round((user.usageCount / user.quota) * 100) : 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Initial setup endpoint - only works if setup is not completed
  app.post("/api/setup", async (req, res) => {
    try {
      // Check if setup is already completed
      const isSetupCompleted = await storage.checkSetupCompleted();
      if (isSetupCompleted) {
        return res.status(400).json({ error: "Setup already completed" });
      }

      const { username, password, appName, modelName, ollamaUrl, modelDisplayName } = req.body;

      // Validate required fields
      if (!username || !password || !appName || !modelName || !ollamaUrl || !modelDisplayName) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Hash the password
      // Import the password hashing function from auth.ts
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Create admin user
      const user = await storage.createUser({ 
        username, 
        password: hashedPassword 
      });

      // Create LLM settings
      await storage.createSetting({ key: 'appName', value: appName, userId: user.id });
      await storage.createSetting({ key: 'modelName', value: modelName, userId: user.id });
      await storage.createSetting({ key: 'ollamaUrl', value: ollamaUrl, userId: user.id });
      await storage.createSetting({ key: 'modelDisplayName', value: modelDisplayName, userId: user.id });
      await storage.createSetting({ key: 'setupCompleted', value: 'true', userId: user.id });

      // Log in the user automatically
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in after setup:", err);
          return res.status(500).json({ error: "Failed to log in after setup" });
        }
        res.status(201).json({ success: true, message: "Setup completed successfully" });
      });
    } catch (error) {
      console.error("Error completing setup:", error);
      res.status(500).json({ error: "Failed to complete setup" });
    }
  });

  // LLM Settings endpoints - protected by authentication
  app.get("/api/settings/llm", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const modelName = await storage.getSetting('modelName');
      const ollamaUrl = await storage.getSetting('ollamaUrl');
      const modelDisplayName = await storage.getSetting('modelDisplayName');

      if (!modelName || !ollamaUrl || !modelDisplayName) {
        return res.status(404).json({ error: "LLM settings not found" });
      }

      res.json({
        modelName: modelName.value,
        ollamaUrl: ollamaUrl.value,
        modelDisplayName: modelDisplayName.value
      });
    } catch (error) {
      console.error("Error fetching LLM settings:", error);
      res.status(500).json({ error: "Failed to fetch LLM settings" });
    }
  });

  // Update LLM settings
  app.put("/api/settings/llm", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { modelName, ollamaUrl, modelDisplayName } = req.body;

      // Validate required fields
      if (!modelName || !ollamaUrl || !modelDisplayName) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Get existing settings
      const modelNameSetting = await storage.getSetting('modelName');
      const ollamaUrlSetting = await storage.getSetting('ollamaUrl');
      const modelDisplayNameSetting = await storage.getSetting('modelDisplayName');

      // Update settings
      if (modelNameSetting) {
        await storage.updateSetting(modelNameSetting.id, { value: modelName });
      }
      
      if (ollamaUrlSetting) {
        await storage.updateSetting(ollamaUrlSetting.id, { value: ollamaUrl });
      }
      
      if (modelDisplayNameSetting) {
        await storage.updateSetting(modelDisplayNameSetting.id, { value: modelDisplayName });
      }

      res.json({
        success: true,
        modelName,
        ollamaUrl,
        modelDisplayName
      });
    } catch (error) {
      console.error("Error updating LLM settings:", error);
      res.status(500).json({ error: "Failed to update LLM settings" });
    }
  });

  // API route to call the Llama API - protected by authentication
  app.post("/api/llama/generate", isAuthenticated, async (req, res) => {
    try {
      const {
        model,
        prompt,
        stream = false,
        temperature,
        topP,
        topK,
        maxTokens
      } = req.body;

      // Validate request
      if (!model || !prompt) {
        return res.status(400).json({ error: "Model and prompt are required" });
      }
      
      // Store the user's ID for WebSocket message routing
      const userId = req.user?.id;
      
      // Check message against blocked keywords
      const keywordCheck = await storage.checkMessageAgainstBlockedKeywords(prompt);
      if (keywordCheck.isBlocked) {
        return res.status(403).json({ 
          error: "Your message contains blocked content", 
          keyword: keywordCheck.keyword 
        });
      }

      // If streaming is requested, pipe the response directly
      if (stream) {
        // Get the default model if needed (for admin panel to work with custom models later)
        let modelToUse = model;
        
        // If using database model selection
        const modelObj = await storage.getModelByName(model);
        if (modelObj) {
          // Update user usage counter
          await storage.updateUserUsage(userId as number);
        }

        const llamaResponse = await axios.post(
          LLAMA_API_URL,
          {
            model: modelToUse,
            prompt,
            stream: true,
            temperature,
            top_p: topP,
            top_k: topK,
            max_tokens: maxTokens
          },
          {
            responseType: "stream",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Set appropriate headers for streaming
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Transfer-Encoding", "chunked");
        
        // Process the stream and forward it chunk by chunk to improve real-time response
        llamaResponse.data.on('data', (chunk: Buffer) => {
          try {
            // Send each chunk immediately as it arrives
            res.write(chunk);
            
            // Also send over WebSocket for even faster realtime response
            const chunkStr = chunk.toString();
            
            try {
              // Try to parse the JSON chunk for proper WebSocket broadcast
              const parsedChunk = JSON.parse(chunkStr);
              
              // Broadcast to WebSocket clients belonging to this user
              wss.clients.forEach((client: any) => {
                if (client.readyState === WebSocket.OPEN && client.userId === userId) {
                  client.send(JSON.stringify({
                    type: 'stream',
                    payload: parsedChunk
                  }));
                }
              });
            } catch (e) {
              // If chunk is not valid JSON, just ignore for WebSocket
              console.debug("Non-JSON chunk received:", e);
            }
            
            // Ensure immediate delivery by flushing the buffer
            // @ts-ignore - Express Response may have flush method in some environments
            if (typeof res.flush === 'function') {
              // @ts-ignore
              res.flush();
            } else {
              // Alternative method to ensure data is sent immediately
              res.flushHeaders();
            }
          } catch (error) {
            console.error("Error writing stream chunk:", error);
          }
        });
        
        llamaResponse.data.on('end', () => {
          // Signal completion via WebSocket too
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN && client.userId === userId) {
              client.send(JSON.stringify({
                type: 'streamEnd',
                payload: { completed: true }
              }));
            }
          });
          res.end();
        });
        
        llamaResponse.data.on('error', (error: Error) => {
          console.error("Stream error:", error);
          // Send error via WebSocket too
          wss.clients.forEach((client: any) => {
            if (client.readyState === WebSocket.OPEN && client.userId === userId) {
              client.send(JSON.stringify({
                type: 'streamError',
                payload: { error: error.message }
              }));
            }
          });
          res.end();
        });
      } else {
        // For non-streaming requests, wait for the complete response
        const llamaResponse = await axios.post(
          LLAMA_API_URL,
          {
            model,
            prompt,
            stream: false,
            temperature,
            top_p: topP,
            top_k: topK,
            max_tokens: maxTokens
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Update user usage counter
        await storage.updateUserUsage(userId as number);
        
        // Return the complete response
        res.json(llamaResponse.data);
      }
    } catch (error) {
      console.error("Error calling Llama API:", error);
      
      // Extract error message from axios error if possible
      let errorMessage = "Failed to call Llama API";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data?.error || `API error: ${error.response.status}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // API route to cancel ongoing generation
  app.post("/api/llama/cancel", isAuthenticated, async (req, res) => {
    try {
      await axios.post(`${LLAMA_API_URL}/cancel`, {}, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling generation:", error);
      res.status(500).json({ error: "Failed to cancel generation" });
    }
  });

  // Conversations API routes
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const { title } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const conversation = await storage.createConversation({ title, userId });
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      
      res.json({
        ...conversation,
        messages,
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.put("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { title } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updatedConversation = await storage.updateConversation(conversationId, { title });
      res.json(updatedConversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteConversation(conversationId);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages API routes
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { role, content } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!role || !content) {
        return res.status(400).json({ error: "Role and content are required" });
      }
      
      // If it's a user message, check against blocked keywords
      if (role === 'user') {
        const keywordCheck = await storage.checkMessageAgainstBlockedKeywords(content);
        if (keywordCheck.isBlocked) {
          return res.status(403).json({ 
            error: "Your message contains blocked content",
            keyword: keywordCheck.keyword 
          });
        }
      }

      const message = await storage.createMessage({ conversationId, role, content });
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Admin API routes for blocked keywords
  app.get("/api/admin/blocked-keywords", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      
      // Get all blocked keywords
      const blockedKeywords = await storage.getAllBlockedKeywords();
      res.json(blockedKeywords);
    } catch (error) {
      console.error("Error fetching blocked keywords:", error);
      res.status(500).json({ error: "Failed to fetch blocked keywords" });
    }
  });
  
  app.post("/api/admin/blocked-keywords", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      
      const { keyword } = req.body;
      if (!keyword) {
        return res.status(400).json({ error: "Keyword is required" });
      }
      
      // Create new blocked keyword
      const blockedKeyword = await storage.createBlockedKeyword({ 
        keyword, 
        createdBy: userId 
      });
      
      res.status(201).json(blockedKeyword);
    } catch (error) {
      console.error("Error creating blocked keyword:", error);
      res.status(500).json({ error: "Failed to create blocked keyword" });
    }
  });
  
  app.delete("/api/admin/blocked-keywords/:id", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      
      const keywordId = parseInt(req.params.id);
      if (isNaN(keywordId)) {
        return res.status(400).json({ error: "Invalid keyword ID" });
      }
      
      // Delete the blocked keyword
      const success = await storage.deleteBlockedKeyword(keywordId);
      if (!success) {
        return res.status(404).json({ error: "Blocked keyword not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting blocked keyword:", error);
      res.status(500).json({ error: "Failed to delete blocked keyword" });
    }
  });
  
  // Admin API routes for user management
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Remove passwords from the response
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  app.put("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const adminUser = await storage.getUser(adminId);
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const { isActive, quota, isAdmin } = req.body;
      
      // Update user with specified fields
      const updatedUser = await storage.updateUser(userId, { 
        ...(isActive !== undefined && { isActive }),
        ...(quota !== undefined && { quota: parseInt(quota) }),
        ...(isAdmin !== undefined && { isAdmin })
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    // Parse session cookie to authenticate WebSocket client
    // This will require extracting the sid from the cookie and looking up the session
    const cookieHeader = req.headers.cookie;
    
    // User authentication for WebSocket
    ws.on('message', async (message: any) => {
      try {
        const { type, payload } = JSON.parse(message.toString());
        console.log(`WebSocket message received: ${type}`);
        
        // Handle auth message to associate user ID with this connection
        if (type === 'auth') {
          const { userId } = payload;
          if (userId) {
            // Store userId in WebSocket object for routing messages
            (ws as any).userId = userId;
            console.log(`WebSocket authenticated for user ${userId}`);
            
            // Send confirmation
            ws.send(JSON.stringify({
              type: 'auth',
              payload: { 
                authenticated: true, 
                userId,
                timestamp: Date.now() 
              }
            }));
          }
        }
        // Handle stream messages more efficiently
        else if (type === 'stream') {
          // If message contains streaming content, route only to connections with same userId
          const { userId } = payload;
          if (userId) {
            wss.clients.forEach((client: any) => {
              if (client !== ws && 
                  client.readyState === WebSocket.OPEN && 
                  client.userId === userId) {
                try {
                  client.send(JSON.stringify({ type, payload }));
                } catch (err) {
                  console.error('Error sending stream message to client:', err);
                }
              }
            });
          }
        }
        // Handle other message types
        else {
          // Send an immediate acknowledgment to the sender
          ws.send(JSON.stringify({
            type: 'acknowledge',
            payload: { messageType: type, received: true, timestamp: Date.now() }
          }));
          
          // Get userId from the connection if available
          const userId = (ws as any).userId;
          
          // Broadcast the message only to clients with same userId (if authenticated)
          if (userId) {
            wss.clients.forEach((client: any) => {
              if (client !== ws && 
                  client.readyState === WebSocket.OPEN && 
                  client.userId === userId) {
                try {
                  client.send(JSON.stringify({ type, payload }));
                } catch (err) {
                  console.error('Error broadcasting message to client:', err);
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          payload: { message: 'Invalid message format', timestamp: Date.now() }
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', () => {
      const userId = (ws as any).userId;
      console.log(`WebSocket client disconnected${userId ? ` (userId: ${userId})` : ''}`);
    });

    // Send a welcome message
    ws.send(JSON.stringify({ 
      type: 'connection', 
      payload: { message: 'Connected to WebSocket server', timestamp: Date.now() } 
    }));
  });

  return httpServer;
}
