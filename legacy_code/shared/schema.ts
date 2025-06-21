import { pgTable, text, serial, integer, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("patient").notNull(), // 'patient', 'doctor', 'admin'
  email: text("email"),
  name: text("name"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Subscription fields
  isSubscriptionActive: boolean("is_subscription_active").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
});

export const patientScores = pgTable("patient_scores", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  dietScore: integer("diet_score").notNull(),
  exerciseScore: integer("exercise_score").notNull(),
  medicationScore: integer("medication_score").notNull(),
  scoreDate: timestamp("score_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const motivationalImages = pgTable("motivational_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  imageData: text("image_data").notNull(), // URL or base64 data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientBadges = pgTable("patient_badges", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeName: text("badge_name").notNull(), // e.g., "Healthy Meal Plan Hero"
  badgeTier: text("badge_tier").notNull(), // 'Bronze', 'Silver', 'Gold', 'Platinum'
  earnedDate: timestamp("earned_date").defaultNow().notNull(),
  // A unique constraint to ensure a patient can only earn each badge tier once
}, (table) => ({
  patientBadgeUnique: uniqueIndex("patient_badge_unique_idx").on(table.patientId, table.badgeName, table.badgeTier)
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  email: true,
  name: true,
  phoneNumber: true,
});

export const insertPatientScoreSchema = createInsertSchema(patientScores).pick({
  patientId: true,
  dietScore: true,
  exerciseScore: true,
  medicationScore: true,
}).extend({
  dietScore: z.number().min(1).max(10),
  exerciseScore: z.number().min(1).max(10),
  medicationScore: z.number().min(1).max(10),
});

export const insertMotivationalImageSchema = createInsertSchema(motivationalImages).pick({
  userId: true,
  imageData: true,
});

export const insertPatientBadgeSchema = createInsertSchema(patientBadges).pick({
  patientId: true,
  badgeName: true,
  badgeTier: true,
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  isSetupComplete: boolean("is_setup_complete").default(false),
  setupToken: text("setup_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDoctorSchema = createInsertSchema(doctors).pick({
  name: true,
  email: true,
  phone: true,
}).extend({
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export const doctorPatients = pgTable("doctor_patients", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  doctorPatientUnique: uniqueIndex("doctor_patient_unique_idx").on(table.doctorId, table.patientId)
}));

export const carePlanDirectives = pgTable("care_plan_directives", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  dietCpd: text("diet_cpd"),
  exerciseCpd: text("exercise_cpd"),
  medicationCpd: text("medication_cpd"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  patientCpdUnique: uniqueIndex("patient_cpd_unique_idx").on(table.patientId)
}));

export const insertDoctorPatientSchema = createInsertSchema(doctorPatients).pick({
  doctorId: true,
  patientId: true,
});

export const insertCarePlanDirectiveSchema = createInsertSchema(carePlanDirectives).pick({
  patientId: true,
  doctorId: true,
  dietCpd: true,
  exerciseCpd: true,
  medicationCpd: true,
});

// Doctor-specific patient data segregation tables
export const doctorPatientSessions = pgTable("doctor_patient_sessions", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionData: text("session_data"), // JSON data for patient-specific context
  lastAccessed: timestamp("last_accessed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  doctorPatientSessionUnique: uniqueIndex("doctor_patient_session_unique_idx").on(table.doctorId, table.patientId)
}));

export const supervisorAgentLogs = pgTable("supervisor_agent_logs", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // 'cpd_update', 'ppr_generation', 'score_analysis', etc.
  context: text("context"), // JSON context data
  aiResponse: text("ai_response"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patientDataAccess = pgTable("patient_data_access", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessType: text("access_type").notNull(), // 'view', 'edit', 'cpd_update', 'ppr_generate'
  dataType: text("data_type").notNull(), // 'scores', 'cpds', 'badges', 'full_profile'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertDoctorPatientSessionSchema = createInsertSchema(doctorPatientSessions).pick({
  doctorId: true,
  patientId: true,
  sessionData: true,
});

export const insertSupervisorAgentLogSchema = createInsertSchema(supervisorAgentLogs).pick({
  doctorId: true,
  patientId: true,
  action: true,
  context: true,
  aiResponse: true,
});

export const insertPatientDataAccessSchema = createInsertSchema(patientDataAccess).pick({
  doctorId: true,
  patientId: true,
  accessType: true,
  dataType: true,
  ipAddress: true,
  userAgent: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatientScore = z.infer<typeof insertPatientScoreSchema>;
export type PatientScore = typeof patientScores.$inferSelect;
export type InsertMotivationalImage = z.infer<typeof insertMotivationalImageSchema>;
export type MotivationalImage = typeof motivationalImages.$inferSelect;
export type InsertPatientBadge = z.infer<typeof insertPatientBadgeSchema>;
export type PatientBadge = typeof patientBadges.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctorPatient = z.infer<typeof insertDoctorPatientSchema>;
export type DoctorPatient = typeof doctorPatients.$inferSelect;
export type InsertCarePlanDirective = z.infer<typeof insertCarePlanDirectiveSchema>;
export type CarePlanDirective = typeof carePlanDirectives.$inferSelect;
export type InsertDoctorPatientSession = z.infer<typeof insertDoctorPatientSessionSchema>;
export type DoctorPatientSession = typeof doctorPatientSessions.$inferSelect;
export type InsertSupervisorAgentLog = z.infer<typeof insertSupervisorAgentLogSchema>;
export type SupervisorAgentLog = typeof supervisorAgentLogs.$inferSelect;
export type InsertPatientDataAccess = z.infer<typeof insertPatientDataAccessSchema>;
export type PatientDataAccess = typeof patientDataAccess.$inferSelect;
