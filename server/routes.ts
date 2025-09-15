import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertServerSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { fileService } from "./services/file-service";
import { processService } from "./services/process-service";

// Extend Express Request type to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
  }
}

const upload = multer({ dest: "uploads/" });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections by server ID
  const serverConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const serverId = url.searchParams.get('serverId');
    
    if (serverId) {
      if (!serverConnections.has(serverId)) {
        serverConnections.set(serverId, new Set());
      }
      serverConnections.get(serverId)!.add(ws);

      ws.on('close', () => {
        serverConnections.get(serverId)?.delete(ws);
      });
    }
  });

  // Broadcast logs to connected clients
  function broadcastLog(serverId: string, message: string) {
    const connections = serverConnections.get(serverId);
    if (connections) {
      const logMessage = JSON.stringify({
        type: 'log',
        timestamp: new Date().toISOString(),
        message
      });
      
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(logMessage);
        }
      });
    }
  }

  // Authentication endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (username === "JOHN" && password === "REESE") {
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.createUser({ username, password: "hashed" });
        }
        
        // Set session
        (req.session as any).userId = user.id;
        res.json({ success: true, user: { id: user.id, username: user.username } });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Check authentication status
  app.get("/api/auth/check", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ authenticated: false });
      }
      
      // Get user details from database
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ authenticated: false });
      }
      
      res.json({ 
        authenticated: true, 
        user: { id: user.id, username: user.username } 
      });
    } catch (error) {
      res.status(500).json({ authenticated: false, message: "Server error" });
    }
  });

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Server management endpoints
  app.get("/api/servers", requireAuth, async (req: any, res) => {
    try {
      const servers = await storage.getServersByUserId(req.session.userId);
      res.json(servers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.post("/api/servers", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const existingServers = await storage.getServersByUserId(userId);
      
      if (existingServers.length >= 3) {
        return res.status(400).json({ message: "Server limit reached (maximum 3 servers)" });
      }

      // Create server directory first
      const serverPath = await fileService.createServerDirectory();
      
      // Now validate with all required fields
      const serverData = insertServerSchema.parse({
        ...req.body,
        userId,
        rootPath: serverPath,
      });
      
      const server = await storage.createServer(serverData);

      broadcastLog(server.id, `Server ${server.name} created successfully`);
      res.json(server);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Server creation error:", error);
      res.status(500).json({ 
        message: "Failed to create server", 
        error: errorMessage 
      });
    }
  });

  app.get("/api/servers/:id", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }
      res.json(server);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch server" });
    }
  });

  app.put("/api/servers/:id", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      const updatedServer = await storage.updateServer(req.params.id, req.body);
      res.json(updatedServer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update server" });
    }
  });

  app.delete("/api/servers/:id", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Stop process if running
      if (server.processId) {
        await processService.stopProcess(server.processId);
      }

      // Delete server files
      await fileService.deleteServerDirectory(server.rootPath);

      // Delete from storage
      await storage.deleteServer(req.params.id);

      broadcastLog(server.id, `Server ${server.name} deleted`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete server" });
    }
  });

  // File management endpoints
  app.post("/api/servers/:id/upload", requireAuth, upload.single("zip"), async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const result = await fileService.uploadAndExtractZip(req.file.path, server.rootPath);
      broadcastLog(server.id, `ZIP file uploaded and extracted: ${result.extractedFiles.length} files`);
      
      res.json(result);
    } catch (error) {
      broadcastLog(req.params.id, `Upload failed: ${error}`);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/servers/:id/files", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      const subPath = req.query.path as string || '';
      const files = await fileService.listFiles(server.rootPath, subPath);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to list files" });
    }
  });

  app.post("/api/servers/:id/move-to-root", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      const { filePaths } = req.body;
      const result = await fileService.moveFilesToRoot(server.rootPath, filePaths);
      
      broadcastLog(server.id, `Moved ${filePaths.length} files to root directory`);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to move files";
      broadcastLog(req.params.id, `Move to root failed: ${errorMessage}`);
      res.status(400).json({ message: errorMessage });
    }
  });

  app.delete("/api/servers/:id/files", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      const { filePath } = req.body;
      await fileService.deleteFile(path.join(server.rootPath, filePath));
      
      broadcastLog(server.id, `File deleted: ${filePath}`);
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete file";
      broadcastLog(req.params.id, `Delete failed: ${errorMessage}`);
      res.status(400).json({ message: errorMessage });
    }
  });

  // Process management endpoints
  app.post("/api/servers/:id/start", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Check if server directory exists and has files
      const serverExists = await fs.pathExists(server.rootPath);
      if (!serverExists) {
        broadcastLog(server.id, "Error: Server directory not found. Please upload your bot files first.");
        return res.status(400).json({ message: "Server directory not found. Please upload your bot files first." });
      }

      // Check for files in .root_moved directory first, then fallback to root
      const rootMovedPath = path.join(server.rootPath, ".root_moved");
      let files = [];
      
      if (await fs.pathExists(rootMovedPath)) {
        files = await fs.readdir(rootMovedPath);
        if (files.length === 0) {
          broadcastLog(server.id, "Error: No files found in root moved directory. Please move your bot files to root first.");
          return res.status(400).json({ message: "No files found in root moved directory. Please move your bot files to root first." });
        }
      } else {
        files = await fs.readdir(server.rootPath);
        if (files.length === 0) {
          broadcastLog(server.id, "Error: No files found in server directory. Please upload your bot files first.");
          return res.status(400).json({ message: "No files found in server directory. Please upload your bot files first." });
        }
      }

      broadcastLog(server.id, "Starting bot process...");
      
      const processId = await processService.startProcess(
        server.id,
        server.rootPath,
        server.envVars || {},
        (log: string) => broadcastLog(server.id, log)
      );

      await storage.updateServer(server.id, { 
        processId, 
        status: "running" 
      });

      res.json({ success: true, processId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      broadcastLog(req.params.id, `Start failed: ${errorMessage}`);
      
      // Update server status to stopped on failure
      await storage.updateServer(req.params.id, { 
        processId: null, 
        status: "stopped" 
      });
      
      res.status(500).json({ message: errorMessage });
    }
  });

  app.post("/api/servers/:id/stop", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (server.processId) {
        await processService.stopProcess(server.processId);
        broadcastLog(server.id, "Bot process stopped");
      }

      await storage.updateServer(server.id, { 
        processId: null, 
        status: "stopped" 
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop process" });
    }
  });

  app.post("/api/servers/:id/restart", requireAuth, async (req: any, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server || server.userId !== req.session.userId) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (server.processId) {
        await processService.stopProcess(server.processId);
        broadcastLog(server.id, "Restarting bot process...");
      }

      const processId = await processService.startProcess(
        server.id,
        server.rootPath,
        server.envVars || {},
        (log: string) => broadcastLog(server.id, log)
      );

      await storage.updateServer(server.id, { 
        processId, 
        status: "running" 
      });

      res.json({ success: true, processId });
    } catch (error) {
      res.status(500).json({ message: "Failed to restart process" });
    }
  });

  return httpServer;
}
