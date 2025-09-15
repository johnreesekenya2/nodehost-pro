import { type User, type InsertUser, type Server, type InsertServer, users, servers } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getServer(id: string): Promise<Server | undefined>;
  getServersByUserId(userId: string): Promise<Server[]>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: string, updates: Partial<Server>): Promise<Server | undefined>;
  deleteServer(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getServer(id: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }

  async getServersByUserId(userId: string): Promise<Server[]> {
    return await db.select().from(servers).where(eq(servers.userId, userId));
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    const [server] = await db
      .insert(servers)
      .values({
        ...insertServer,
        status: insertServer.status || "stopped",
        envVars: insertServer.envVars || {},
      })
      .returning();
    return server;
  }

  async updateServer(id: string, updates: Partial<Server>): Promise<Server | undefined> {
    const [server] = await db
      .update(servers)
      .set(updates)
      .where(eq(servers.id, id))
      .returning();
    return server || undefined;
  }

  async deleteServer(id: string): Promise<boolean> {
    const result = await db.delete(servers).where(eq(servers.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
