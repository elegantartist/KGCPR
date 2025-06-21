import { db } from "../db";
import { 
  doctorPatientSessions, 
  supervisorAgentLogs, 
  patientDataAccess,
  type InsertDoctorPatientSession,
  type InsertSupervisorAgentLog,
  type InsertPatientDataAccess
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

class DataSegregationService {
  /**
   * Create or update doctor-patient session data
   */
  async createOrUpdateDoctorSession(doctorId: number, patientId: number, sessionData: any): Promise<void> {
    try {
      const existingSession = await db
        .select()
        .from(doctorPatientSessions)
        .where(and(
          eq(doctorPatientSessions.doctorId, doctorId),
          eq(doctorPatientSessions.patientId, patientId)
        ))
        .limit(1);

      if (existingSession.length > 0) {
        // Update existing session
        await db
          .update(doctorPatientSessions)
          .set({
            sessionData: JSON.stringify(sessionData),
            lastAccessed: new Date()
          })
          .where(and(
            eq(doctorPatientSessions.doctorId, doctorId),
            eq(doctorPatientSessions.patientId, patientId)
          ));
      } else {
        // Create new session
        await db
          .insert(doctorPatientSessions)
          .values({
            doctorId,
            patientId,
            sessionData: JSON.stringify(sessionData)
          });
      }
    } catch (error) {
      console.error("Error managing doctor-patient session:", error);
      throw error;
    }
  }

  /**
   * Get doctor-patient session data
   */
  async getDoctorSession(doctorId: number, patientId: number): Promise<any> {
    try {
      const [session] = await db
        .select()
        .from(doctorPatientSessions)
        .where(and(
          eq(doctorPatientSessions.doctorId, doctorId),
          eq(doctorPatientSessions.patientId, patientId)
        ))
        .limit(1);

      if (session) {
        // Update last accessed
        await db
          .update(doctorPatientSessions)
          .set({ lastAccessed: new Date() })
          .where(and(
            eq(doctorPatientSessions.doctorId, doctorId),
            eq(doctorPatientSessions.patientId, patientId)
          ));

        return session.sessionData ? JSON.parse(session.sessionData) : null;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving doctor-patient session:", error);
      return null;
    }
  }

  /**
   * Log supervisor agent activity
   */
  async logSupervisorActivity(
    doctorId: number | null,
    patientId: number | null,
    action: string,
    context?: any,
    aiResponse?: string
  ): Promise<void> {
    try {
      await db
        .insert(supervisorAgentLogs)
        .values({
          doctorId,
          patientId,
          action,
          context: context ? JSON.stringify(context) : null,
          aiResponse
        });
    } catch (error) {
      console.error("Error logging supervisor agent activity:", error);
      throw error;
    }
  }

  /**
   * Log patient data access
   */
  async logDataAccess(
    doctorId: number,
    patientId: number,
    accessType: string,
    dataType: string,
    req: any
  ): Promise<void> {
    try {
      await db
        .insert(patientDataAccess)
        .values({
          doctorId,
          patientId,
          accessType,
          dataType,
          ipAddress: req.ip || 'Unknown',
          userAgent: req.get('User-Agent') || 'Unknown'
        });
    } catch (error) {
      console.error("Error logging data access:", error);
      throw error;
    }
  }

  /**
   * Get supervisor agent logs for monitoring
   */
  async getSupervisorLogs(doctorId?: number, patientId?: number, limit: number = 100): Promise<any[]> {
    try {
      let query = db.select().from(supervisorAgentLogs);

      if (doctorId && patientId) {
        query = query.where(and(
          eq(supervisorAgentLogs.doctorId, doctorId),
          eq(supervisorAgentLogs.patientId, patientId)
        ));
      } else if (doctorId) {
        query = query.where(eq(supervisorAgentLogs.doctorId, doctorId));
      } else if (patientId) {
        query = query.where(eq(supervisorAgentLogs.patientId, patientId));
      }

      const logs = await query
        .orderBy(supervisorAgentLogs.timestamp)
        .limit(limit);

      return logs.map(log => ({
        ...log,
        context: log.context ? JSON.parse(log.context) : null
      }));
    } catch (error) {
      console.error("Error retrieving supervisor logs:", error);
      return [];
    }
  }

  /**
   * Get data access audit trail
   */
  async getDataAccessAudit(doctorId?: number, patientId?: number, limit: number = 100): Promise<any[]> {
    try {
      let query = db.select().from(patientDataAccess);

      if (doctorId && patientId) {
        query = query.where(and(
          eq(patientDataAccess.doctorId, doctorId),
          eq(patientDataAccess.patientId, patientId)
        ));
      } else if (doctorId) {
        query = query.where(eq(patientDataAccess.doctorId, doctorId));
      } else if (patientId) {
        query = query.where(eq(patientDataAccess.patientId, patientId));
      }

      return await query
        .orderBy(patientDataAccess.timestamp)
        .limit(limit);
    } catch (error) {
      console.error("Error retrieving data access audit:", error);
      return [];
    }
  }
}

export const dataSegregationService = new DataSegregationService();