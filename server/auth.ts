import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  console.log('Hashing password...');
  const salt = randomBytes(16).toString("hex");
  console.log(`Generated salt: ${salt}`);
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const result = `${buf.toString("hex")}.${salt}`;
  console.log(`Hashed password with salt: ${result}`);
  return result;
}

async function comparePasswords(supplied: string, stored: string) {
  console.log(`Comparing passwords...`);
  console.log(`Supplied password length: ${supplied ? supplied.length : 'undefined'}`);
  console.log(`Stored password: ${stored}`);
  
  if (!stored || typeof stored !== 'string' || !stored.includes('.')) {
    console.error('Invalid stored password format');
    return false;
  }
  
  const parts = stored.split(".");
  if (parts.length !== 2) {
    console.error(`Invalid password format, expected 2 parts but got ${parts.length}`);
    return false;
  }
  
  const [hashed, salt] = parts;
  
  if (!hashed || !salt) {
    console.error(`Invalid password hash or salt: hash=${Boolean(hashed)}, salt=${Boolean(salt)}`);
    return false;
  }
  
  console.log(`Using salt for comparison: ${salt}`);
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const result = timingSafeEqual(hashedBuf, suppliedBuf);
  console.log(`Password comparison result: ${result}`);
  return result;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        // Debug: Check if user exists
        if (!user) {
          console.log(`User not found: ${username}`);
          // Debug: Display all users in the system
          const allUsers = storage.debugGetAllUsers().map(u => u.username);
          console.log(`Available users: ${JSON.stringify(allUsers)}`);
          return done(null, false, { message: "Incorrect username" });
        }
        
        console.log(`User found: ${username}, checking password`);
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Incorrect password" });
        }
        
        console.log(`Login successful for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error(`Login error for ${username}:`, err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration attempt received');
      const { username, password } = req.body;
      console.log(`Registration for username: ${username}`);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`User ${username} already exists, rejecting registration`);
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password and create user
      console.log(`Creating user ${username} with hashed password`);
      const hashedPassword = await hashPassword(password);
      console.log(`Password hashed successfully: ${hashedPassword.substring(0, 10)}...`);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });
      console.log(`User created with ID: ${user.id}`);
      
      // Debug: Display all users in the system after adding the new one
      const allUsers = storage.debugGetAllUsers().map(u => `${u.username} (${u.id})`);
      console.log(`Users after registration: ${JSON.stringify(allUsers)}`);
      
      // Log the user in
      console.log(`Logging in new user: ${user.username}`);
      req.login(user, (err) => {
        if (err) {
          console.error(`Error logging in new user: ${err.message}`);
          return next(err);
        }
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        console.log(`User ${username} registered and logged in successfully`);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Authentication failed" });
      
      req.login(user, (err: Error) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as Express.User;
    res.json(userWithoutPassword);
  });
  
  // User profile API route
  app.get("/api/user/profile", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User ID not found" });
      }
      
      // Calculate usage percentage for quota display
      const user = req.user as Express.User;
      const usagePercentage = user.quota > 0 ? (user.usageCount / user.quota) * 100 : 0;
      
      // Return user without password, with additional computed fields
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        ...userWithoutPassword,
        usagePercentage,
        // Format dates nicely (ISO strings)
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null
      });
    } catch (error) {
      console.error("Error generating user profile:", error);
      res.status(500).json({ error: "Failed to generate user profile" });
    }
  });
}