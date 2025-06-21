import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { db } from '../../db';
import { users, patientScores } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';
import { trendAnalysisService } from '../../services/trendAnalysisService';

// Mock WebSocket for testing
const mockWebSocketSend = vi.fn();
vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    clients: new Set([{ send: mockWebSocketSend }])
  }))
}));

describe('Proactive Agent Logic Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let testPatientId: number;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data and reset mocks
    await db.delete(patientScores);
    await db.delete(users);
    mockWebSocketSend.mockClear();

    // Create test patient
    const [testUser] = await db
      .insert(users)
      .values({
        username: 'test_patient',
        password: 'test_password',
        role: 'patient',
        name: 'Test Patient',
        email: 'patient@test.com',
        phoneNumber: '+1234567890'
      })
      .returning();

    testPatientId = testUser.id;
  });

  it('should detect declining diet trend and trigger proactive suggestion', async () => {
    // Step 1: Seed the database with a specific declining score pattern
    const baseDate = new Date('2025-06-10');
    const scorePattern = [
      { dietScore: 9, exerciseScore: 7, medicationScore: 8, dayOffset: 0 },
      { dietScore: 8, exerciseScore: 7, medicationScore: 8, dayOffset: 1 },
      { dietScore: 7, exerciseScore: 7, medicationScore: 8, dayOffset: 2 },
      { dietScore: 6, exerciseScore: 7, medicationScore: 8, dayOffset: 3 },
      { dietScore: 5, exerciseScore: 7, medicationScore: 8, dayOffset: 4 }
    ];

    for (const pattern of scorePattern) {
      const scoreDate = new Date(baseDate);
      scoreDate.setDate(baseDate.getDate() + pattern.dayOffset);
      
      await db.insert(patientScores).values({
        patientId: testPatientId,
        dietScore: pattern.dietScore,
        exerciseScore: pattern.exerciseScore,
        medicationScore: pattern.medicationScore,
        scoreDate: scoreDate.toISOString().split('T')[0]
      });
    }

    // Step 2: Call POST /api/scores to trigger trend analysis
    const newScoreData = {
      patientId: testPatientId,
      dietScore: 4, // Continuing the declining trend
      exerciseScore: 7,
      medicationScore: 8,
      date: '2025-06-15'
    };

    const response = await request(app)
      .post('/api/scores')
      .send(newScoreData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Step 3: Verify that trend analysis correctly identifies the declining pattern
    const trendAnalysis = await trendAnalysisService.analyzeTrends(testPatientId);
    
    expect(trendAnalysis).toBeDefined();
    expect(trendAnalysis.dietTrend).toBe('declining');
    expect(trendAnalysis.triggerProactiveSuggestion).toBe(true);
    expect(trendAnalysis.suggestions).toContain('diet');

    // Step 4: Verify WebSocket event was fired for proactive suggestion
    // Note: This tests the WebSocket broadcasting mechanism
    expect(mockWebSocketSend).toHaveBeenCalled();
    
    const sentMessage = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(sentMessage.type).toBe('proactive_suggestion');
    expect(sentMessage.data).toBeDefined();
    expect(sentMessage.data.patientId).toBe(testPatientId);
    expect(sentMessage.data.category).toBe('diet');
  });

  it('should detect improving exercise trend and send positive reinforcement', async () => {
    // Seed database with improving exercise pattern
    const baseDate = new Date('2025-06-10');
    const improvingPattern = [
      { dietScore: 7, exerciseScore: 4, medicationScore: 8, dayOffset: 0 },
      { dietScore: 7, exerciseScore: 5, medicationScore: 8, dayOffset: 1 },
      { dietScore: 7, exerciseScore: 6, medicationScore: 8, dayOffset: 2 },
      { dietScore: 7, exerciseScore: 7, medicationScore: 8, dayOffset: 3 },
      { dietScore: 7, exerciseScore: 8, medicationScore: 8, dayOffset: 4 }
    ];

    for (const pattern of improvingPattern) {
      const scoreDate = new Date(baseDate);
      scoreDate.setDate(baseDate.getDate() + pattern.dayOffset);
      
      await db.insert(patientScores).values({
        patientId: testPatientId,
        dietScore: pattern.dietScore,
        exerciseScore: pattern.exerciseScore,
        medicationScore: pattern.medicationScore,
        scoreDate: scoreDate.toISOString().split('T')[0]
      });
    }

    const newScoreData = {
      patientId: testPatientId,
      dietScore: 7,
      exerciseScore: 9, // Continuing the improving trend
      medicationScore: 8,
      date: '2025-06-15'
    };

    const response = await request(app)
      .post('/api/scores')
      .send(newScoreData)
      .expect(201);

    expect(response.body.success).toBe(true);

    const trendAnalysis = await trendAnalysisService.analyzeTrends(testPatientId);
    
    expect(trendAnalysis.exerciseTrend).toBe('improving');
    expect(trendAnalysis.triggerProactiveSuggestion).toBe(true);
    expect(trendAnalysis.suggestions).toContain('exercise_encouragement');
  });

  it('should not trigger proactive suggestions for stable patterns', async () => {
    // Seed database with stable score pattern
    const baseDate = new Date('2025-06-10');
    const stablePattern = [
      { dietScore: 7, exerciseScore: 7, medicationScore: 8, dayOffset: 0 },
      { dietScore: 7, exerciseScore: 7, medicationScore: 8, dayOffset: 1 },
      { dietScore: 8, exerciseScore: 7, medicationScore: 8, dayOffset: 2 },
      { dietScore: 7, exerciseScore: 8, medicationScore: 8, dayOffset: 3 },
      { dietScore: 7, exerciseScore: 7, medicationScore: 8, dayOffset: 4 }
    ];

    for (const pattern of stablePattern) {
      const scoreDate = new Date(baseDate);
      scoreDate.setDate(baseDate.getDate() + pattern.dayOffset);
      
      await db.insert(patientScores).values({
        patientId: testPatientId,
        dietScore: pattern.dietScore,
        exerciseScore: pattern.exerciseScore,
        medicationScore: pattern.medicationScore,
        scoreDate: scoreDate.toISOString().split('T')[0]
      });
    }

    const newScoreData = {
      patientId: testPatientId,
      dietScore: 7,
      exerciseScore: 7,
      medicationScore: 8,
      date: '2025-06-15'
    };

    const response = await request(app)
      .post('/api/scores')
      .send(newScoreData)
      .expect(201);

    expect(response.body.success).toBe(true);

    const trendAnalysis = await trendAnalysisService.analyzeTrends(testPatientId);
    
    expect(trendAnalysis.triggerProactiveSuggestion).toBe(false);
    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });
});