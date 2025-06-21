import { users, patientScores, motivationalImages, type User, type InsertUser, type PatientScore, type InsertPatientScore, type MotivationalImage, type InsertMotivationalImage } from "../shared/schema";
import { db } from "./db";
import { eq, and, gte, lt, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPatientScore(score: InsertPatientScore): Promise<PatientScore>;
  getPatientScoresByDate(patientId: number, date: string): Promise<PatientScore[]>;
  createMotivationalImage(image: InsertMotivationalImage): Promise<MotivationalImage>;
  getLatestMotivationalImage(userId: number): Promise<MotivationalImage | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
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

  async createPatientScore(insertScore: InsertPatientScore): Promise<PatientScore> {
    const [score] = await db
      .insert(patientScores)
      .values(insertScore)
      .returning();
    return score;
  }

  async getPatientScoresByDate(patientId: number, date: string): Promise<PatientScore[]> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const scores = await db
      .select()
      .from(patientScores)
      .where(
        and(
          eq(patientScores.patientId, patientId),
          gte(patientScores.scoreDate, startOfDay),
          lt(patientScores.scoreDate, endOfDay)
        )
      );
    
    return scores;
  }

  async createMotivationalImage(insertImage: InsertMotivationalImage): Promise<MotivationalImage> {
    const [image] = await db
      .insert(motivationalImages)
      .values(insertImage)
      .returning();
    return image;
  }

  async getLatestMotivationalImage(userId: number): Promise<MotivationalImage | undefined> {
    const [image] = await db
      .select()
      .from(motivationalImages)
      .where(eq(motivationalImages.userId, userId))
      .orderBy(desc(motivationalImages.createdAt))
      .limit(1);
    return image || undefined;
  }
}

export const storage = new DatabaseStorage();
