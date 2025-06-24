import { db } from '../db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { smsService } from './smsService'; // <-- Using the real service

export const authService = {
  async startLogin(email: string, role: 'admin' | 'doctor' | 'patient'): Promise<{ success: boolean; message: string }> {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });

    if (!existingUser) { throw new Error('No user found with that email address.'); }
    if (existingUser.role !== role) { throw new Error(`User is registered as a '<span class="math-inline">\{existingUser\.role\}', not a '</span>{role}'.`); }

    const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    const loginCodeHash = await bcrypt.hash(loginCode, 10);
    const loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(users).set({ loginCodeHash, loginCodeExpiresAt }).where(eq(users.id, existingUser.id));

    // --- THIS NOW CALLS THE REAL TWILIO SERVICE ---
    await smsService.sendVerificationCode(existingUser.phoneNumber, loginCode);

    return { success: true, message: `A verification code has been sent to the phone number associated with ${email}.` };
  },

  async verifyLogin(email: string, code: string): Promise<Omit<typeof users.$inferSelect, 'loginCodeHash' | 'loginCodeExpiresAt'>> {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    if (!user || !user.loginCodeHash || !user.loginCodeExpiresAt) {
      throw new Error('No login attempt found. Please request a new code.');
    }
    if (new Date() > user.loginCodeExpiresAt) {
      await db.update(users).set({ loginCodeHash: null, loginCodeExpiresAt: null }).where(eq(users.id, user.id));
      throw new Error('Your verification code has expired. Please request a new one.');
    }

    const isCodeValid = await bcrypt.compare(code, user.loginCodeHash);
    if (!isCodeValid) { throw new Error('The verification code you entered is incorrect.'); }

    await db.update(users).set({ loginCodeHash: null, loginCodeExpiresAt: null }).where(eq(users.id, user.id));

    const { loginCodeHash, loginCodeExpiresAt, ...safeUser } = user;
    return safeUser;
  }
};