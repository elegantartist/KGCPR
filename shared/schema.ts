import { pgTable, serial, text, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: text('role', { enum: ['admin', 'doctor', 'patient'] }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// We can add more tables here later (doctors, patients, CPDs, etc.)