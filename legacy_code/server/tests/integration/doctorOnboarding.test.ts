import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../db';
import { users, doctors } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';
import { testDataManager, testVerificationCodes } from '../testSetup';

describe('Doctor Onboarding Integration Tests', () => {
  let app: express.Application;
  let server: any;

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
    // Clean up test data before each test
    await db.delete(doctors);
    await db.delete(users).where(eq(users.role, 'admin'));
  });

  it('should complete full doctor onboarding workflow', async () => {
    // Step 1: Create admin user
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

    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe('admin');

    // Step 2: Call POST /api/admin/doctors to create a new doctor
    const doctorData = {
      name: 'Dr. Test Doctor',
      email: 'doctor@test.com',
      phone: '+1234567890'
    };

    const createDoctorResponse = await request(app)
      .post('/api/admin/doctors')
      .send(doctorData)
      .expect(201);

    expect(createDoctorResponse.body.success).toBe(true);
    expect(createDoctorResponse.body.doctor).toBeDefined();
    const createdDoctorId = createDoctorResponse.body.doctor.id;

    // Step 3: Fetch the setup token for that doctor from the database
    const [doctorRecord] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, createdDoctorId));

    expect(doctorRecord).toBeDefined();
    expect(doctorRecord.setupToken).toBeDefined();
    expect(doctorRecord.isSetupComplete).toBe(false);

    const setupToken = doctorRecord.setupToken!;

    // Step 4: Call POST /api/doctor/setup/verify to simulate SMS verification
    const verificationData = {
      token: setupToken,
      code: '123456' // Mock verification code
    };

    const verifyResponse = await request(app)
      .post('/api/doctor/setup/verify')
      .send(verificationData)
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.message).toBe('Doctor setup completed successfully');

    // Step 5: Assert that the doctor's isSetupComplete status is now true
    const [updatedDoctorRecord] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, createdDoctorId));

    expect(updatedDoctorRecord).toBeDefined();
    expect(updatedDoctorRecord.isSetupComplete).toBe(true);
    expect(updatedDoctorRecord.setupToken).toBeNull();
  });

  it('should reject invalid setup tokens', async () => {
    const invalidTokenData = {
      token: 'invalid_token_12345',
      code: '123456'
    };

    const response = await request(app)
      .post('/api/doctor/setup/verify')
      .send(invalidTokenData)
      .expect(400);

    expect(response.body.error).toBe('Invalid or expired setup token.');
  });

  it('should reject setup verification without required fields', async () => {
    const incompleteData = {
      token: 'some_token'
      // Missing code field
    };

    const response = await request(app)
      .post('/api/doctor/setup/verify')
      .send(incompleteData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation failed');
  });
});