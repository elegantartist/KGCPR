import { db } from '../db';
import { users, doctors, patientScores, doctorPatients, carePlanDirectives } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Test data setup utilities
export class TestDataManager {
  async cleanupTestData() {
    // Clean up in reverse dependency order
    await db.delete(carePlanDirectives);
    await db.delete(doctorPatients);
    await db.delete(patientScores);
    await db.delete(doctors);
    await db.delete(users);
  }

  async createTestAdmin() {
    const [adminUser] = await db
      .insert(users)
      .values({
        username: 'test_admin',
        password: 'admin_password',
        role: 'admin',
        name: 'Test Admin',
        email: 'admin@test.com'
      })
      .returning();
    return adminUser;
  }

  async createTestPatient(overrides: Partial<any> = {}) {
    const [patient] = await db
      .insert(users)
      .values({
        username: 'test_patient',
        password: 'test_password',
        role: 'patient',
        name: 'Test Patient',
        email: 'patient@test.com',
        phoneNumber: '+1234567890',
        isSubscriptionActive: true,
        ...overrides
      })
      .returning();
    return patient;
  }

  async createTestDoctor(overrides: Partial<any> = {}) {
    const [doctor] = await db
      .insert(doctors)
      .values({
        name: 'Dr. Test Doctor',
        email: 'doctor@test.com',
        phone: '+1234567890',
        isSetupComplete: false,
        setupToken: 'test_setup_token_12345',
        ...overrides
      })
      .returning();
    return doctor;
  }

  async createTestScores(patientId: number, scorePattern: Array<{
    dietScore: number;
    exerciseScore: number;
    medicationScore: number;
    dayOffset: number;
  }>) {
    const baseDate = new Date('2025-06-10');
    const scores = [];

    for (const pattern of scorePattern) {
      const scoreDate = new Date(baseDate);
      scoreDate.setDate(baseDate.getDate() + pattern.dayOffset);
      
      const [score] = await db.insert(patientScores).values({
        patientId,
        dietScore: pattern.dietScore,
        exerciseScore: pattern.exerciseScore,
        medicationScore: pattern.medicationScore,
        scoreDate: scoreDate.toISOString().split('T')[0]
      }).returning();
      
      scores.push(score);
    }
    
    return scores;
  }

  async assignPatientToDoctor(patientId: number, doctorId: number) {
    const [assignment] = await db
      .insert(doctorPatients)
      .values({
        patientId,
        doctorId
      })
      .returning();
    return assignment;
  }

  async createCarePlanDirective(patientId: number, doctorId: number, directives: {
    dietCpd?: string;
    exerciseCpd?: string;
    medicationCpd?: string;
  }) {
    const [cpd] = await db
      .insert(carePlanDirectives)
      .values({
        patientId,
        doctorId,
        dietCpd: directives.dietCpd || '',
        exerciseCpd: directives.exerciseCpd || '',
        medicationCpd: directives.medicationCpd || ''
      })
      .returning();
    return cpd;
  }
}

// In-memory verification codes for testing
export const testVerificationCodes = new Map<string, {
  code: string;
  doctorId: number;
  expires: number;
}>();

// Mock WebSocket clients for testing
export const mockWebSocketClients = new Set<{
  send: (data: string) => void;
}>();

export const testDataManager = new TestDataManager();