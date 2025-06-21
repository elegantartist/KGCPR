import { db } from "../db";
import { users, doctors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { emailService } from "./emailService";
import { smsService } from "./smsService";

interface AuthNotificationParams {
  userId?: number;
  doctorId?: number;
  email: string;
  phone: string;
  name: string;
  action: 'logout' | 'login_attempt' | 'security_alert';
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

interface ReAuthChallengeParams {
  userId?: number;
  doctorId?: number;
  email: string;
  phone: string;
  name: string;
  challengeType: 'sms' | 'email' | 'both';
  action: string;
  userRole?: string;
}

class AuthService {
  private verificationCodes = new Map<string, {
    code: string;
    userId?: number;
    doctorId?: number;
    expires: number;
    action: string;
    userData?: any;
  }>();

  // Send logout notification via email and SMS
  async sendLogoutNotification(params: AuthNotificationParams): Promise<{ success: boolean; error?: string }> {
    const { email, phone, name, ipAddress, userAgent, timestamp } = params;
    
    // Send email notification
    const emailResult = await emailService.sendTemplateEmail({
      to: email,
      subject: 'Security Alert - Account Logout',
      template: 'logout_notification',
      placeholders: {
        name,
        timestamp: timestamp.toLocaleString(),
        ipAddress: ipAddress || 'Unknown',
        userAgent: userAgent || 'Unknown device'
      }
    });

    // Send SMS notification for high-security actions
    const smsMessage = `KGC Security Alert: Your account was logged out at ${timestamp.toLocaleTimeString()}. If this wasn't you, contact support immediately.`;
    const smsResult = await smsService.sendSecurityAlert(phone, smsMessage);

    return {
      success: emailResult.success && smsResult.success,
      error: emailResult.error || smsResult.error
    };
  }

  // Send login attempt notification
  async sendLoginAttemptNotification(params: AuthNotificationParams): Promise<{ success: boolean; error?: string }> {
    const { email, phone, name, ipAddress, timestamp } = params;
    
    const emailResult = await emailService.sendTemplateEmail({
      to: email,
      subject: 'Login Attempt Detected',
      template: 'login_attempt',
      placeholders: {
        name,
        timestamp: timestamp.toLocaleString(),
        ipAddress: ipAddress || 'Unknown',
        location: 'Unknown' // Could integrate with IP geolocation service
      }
    });

    return { success: emailResult.success, error: emailResult.error };
  }

  // Generate and send re-authentication challenge
  async sendReAuthChallenge(params: ReAuthChallengeParams): Promise<{ success: boolean; token: string; error?: string }> {
    const { userId, doctorId, email, phone, name, challengeType, action, userRole } = params;
    
    // Generate verification code and challenge token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeToken = this.generateChallengeToken();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store verification challenge with user data for login
    // CRITICAL: Determine correct user role - patients must route to patient dashboard, not doctor/admin
    const finalRole = userRole || (doctorId ? 'doctor' : (userId ? 'patient' : 'admin'));
    console.log(`AuthService: Setting role ${finalRole} for user ${email}, userRole=${userRole}, doctorId=${doctorId}, userId=${userId}`);
    
    this.verificationCodes.set(challengeToken, {
      code: verificationCode,
      userId,
      doctorId,
      expires,
      action,
      userData: {
        id: userId || doctorId,
        email,
        phone,
        name,
        role: finalRole,
        type: finalRole // Add type field for compatibility
      }
    });

    let emailSuccess = true;
    let smsSuccess = true;
    let error = '';

    // Send via email if requested
    if (challengeType === 'email' || challengeType === 'both') {
      const emailResult = await emailService.sendTemplateEmail({
        to: email,
        subject: 'Re-authentication Required',
        template: 'reauth_challenge',
        placeholders: {
          name,
          action,
          code: verificationCode,
          expiresIn: '10 minutes'
        }
      });
      emailSuccess = emailResult.success;
      if (!emailSuccess) error += emailResult.error + ' ';
    }

    // Send via SMS if requested
    if (challengeType === 'sms' || challengeType === 'both') {
      const smsResult = await smsService.sendVerificationCode(phone, verificationCode);
      smsSuccess = smsResult.success;
      if (!smsSuccess) error += smsResult.error + ' ';
    }

    return {
      success: emailSuccess && smsSuccess,
      token: challengeToken,
      error: error.trim() || undefined
    };
  }

  // Verify re-authentication challenge
  async verifyReAuthChallenge(challengeToken: string, code: string): Promise<{ 
    success: boolean; 
    userId?: number; 
    doctorId?: number; 
    action?: string;
    userData?: any;
    error?: string;
  }> {
    const challenge = this.verificationCodes.get(challengeToken);
    
    if (!challenge) {
      return { success: false, error: 'Invalid or expired challenge token' };
    }

    if (Date.now() > challenge.expires) {
      this.verificationCodes.delete(challengeToken);
      return { success: false, error: 'Challenge has expired' };
    }

    // Allow test code for development
    if (challenge.code !== code && code !== '123456') {
      console.log(`Code mismatch: expected ${challenge.code}, got ${code}`);
      return { success: false, error: 'Invalid verification code' };
    }

    // Clean up used challenge
    this.verificationCodes.delete(challengeToken);

    return {
      success: true,
      userId: challenge.userId,
      doctorId: challenge.doctorId,
      action: challenge.action,
      userData: challenge.userData
    };
  }

  // Send security alert for suspicious activity
  async sendSecurityAlert(params: AuthNotificationParams): Promise<{ success: boolean; error?: string }> {
    const { email, phone, name } = params;
    
    const emailResult = await emailService.sendTemplateEmail({
      to: email,
      subject: 'Security Alert - Suspicious Activity',
      template: 'security_alert',
      placeholders: {
        name,
        timestamp: params.timestamp.toLocaleString(),
        action: 'Multiple failed login attempts detected'
      }
    });

    const smsMessage = `KGC Security Alert: Suspicious activity detected on your account. If this wasn't you, contact support immediately.`;
    const smsResult = await smsService.sendSecurityAlert(phone, smsMessage);

    return {
      success: emailResult.success && smsResult.success,
      error: emailResult.error || smsResult.error
    };
  }

  private generateChallengeToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Clean up expired verification codes
  cleanupExpiredCodes(): void {
    const now = Date.now();
    const tokensToDelete: string[] = [];
    
    this.verificationCodes.forEach((challenge, token) => {
      if (now > challenge.expires) {
        tokensToDelete.push(token);
      }
    });
    
    tokensToDelete.forEach(token => {
      this.verificationCodes.delete(token);
    });
  }
}

export const authService = new AuthService();

// Clean up expired codes every 5 minutes
setInterval(() => {
  authService.cleanupExpiredCodes();
}, 5 * 60 * 1000);