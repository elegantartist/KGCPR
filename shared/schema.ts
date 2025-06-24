import { pgTable, serial, text, varchar, timestamp, integer, boolean, date, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  name: varchar('name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patientScores = pgTable('patient_scores', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => users.id),
  scoreDate: date('score_date').notNull(),
  dietScore: integer('diet_score').notNull(),
  exerciseScore: integer('exercise_score').notNull(),
  medicationScore: integer('medication_score').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const patientBadges = pgTable('patient_badges', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => users.id),
  badgeType: varchar('badge_type', { length: 100 }).notNull(),
  badgeLevel: varchar('badge_level', { length: 50 }).notNull(),
  earnedDate: timestamp('earned_date').defaultNow().notNull(),
  criteria: text('criteria'),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  specialization: varchar('specialization', { length: 255 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const carePlanDirectives = pgTable('care_plan_directives', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => users.id),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  directive: text('directive').notNull(),
  category: varchar('category', { length: 100 }),
  priority: varchar('priority', { length: 50 }).default('medium'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const doctorPatients = pgTable('doctor_patients', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id),
  patientId: integer('patient_id').notNull().references(() => users.id),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const supervisorAgentLogs = pgTable('supervisor_agent_logs', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => users.id),
  doctorId: integer('doctor_id').references(() => doctors.id),
  action: varchar('action', { length: 255 }).notNull(),
  context: jsonb('context'),
  aiResponse: text('ai_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => users.id),
  messages: jsonb('messages').notNull(),
  sessionStarted: timestamp('session_started').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertPatientScoreSchema = createInsertSchema(patientScores);
export const insertPatientBadgeSchema = createInsertSchema(patientBadges);
export const insertDoctorSchema = createInsertSchema(doctors);
export const insertCarePlanDirectiveSchema = createInsertSchema(carePlanDirectives);
export const insertSupervisorAgentLogSchema = createInsertSchema(supervisorAgentLogs);
export const insertChatSessionSchema = createInsertSchema(chatSessions);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PatientScore = typeof patientScores.$inferSelect;
export type InsertPatientScore = z.infer<typeof insertPatientScoreSchema>;
export type PatientBadge = typeof patientBadges.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type CarePlanDirective = typeof carePlanDirectives.$inferSelect;
export type SupervisorAgentLog = typeof supervisorAgentLogs.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;