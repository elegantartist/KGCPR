import twilio, { Twilio } from 'twilio';

let twilioClient: Twilio | null = null;
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (ACCOUNT_SID && AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);
    console.log("Twilio SMS service initialized.");
} else {
    console.warn("WARNING: Twilio credentials are not fully configured. SMS features will be disabled.");
}

class SMSService {
    public async sendVerificationCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
        if (!twilioClient || !TWILIO_PHONE_NUMBER) {
            const errorMsg = "SMS service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            const message = `Your Keep Going Care verification code is: ${code}`;
            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            console.log(`SMS verification code sent to ${phoneNumber}.`);
            return { success: true };
        } catch (error) {
            console.error("Error sending SMS via Twilio:", error);
            return { success: false, error: (error as Error).message };
        }
    }

    public async sendSecurityAlert(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
        if (!twilioClient || !TWILIO_PHONE_NUMBER) {
            const errorMsg = "SMS service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            console.log(`Security alert SMS sent to ${phoneNumber}.`);
            return { success: true };
        } catch (error) {
            console.error("Error sending security alert SMS via Twilio:", error);
            return { success: false, error: (error as Error).message };
        }
    }

    public async sendLoginNotification(phoneNumber: string, timestamp: string, location?: string): Promise<{ success: boolean; error?: string }> {
        if (!twilioClient || !TWILIO_PHONE_NUMBER) {
            const errorMsg = "SMS service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            const locationText = location ? ` from ${location}` : '';
            const message = `KGC Login: Your account was accessed at ${timestamp}${locationText}. If this wasn't you, contact support immediately.`;
            
            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            console.log(`Login notification SMS sent to ${phoneNumber}.`);
            return { success: true };
        } catch (error) {
            console.error("Error sending login notification SMS via Twilio:", error);
            return { success: false, error: (error as Error).message };
        }
    }

    public async sendLogoutNotification(phoneNumber: string, timestamp: string): Promise<{ success: boolean; error?: string }> {
        if (!twilioClient || !TWILIO_PHONE_NUMBER) {
            const errorMsg = "SMS service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            const message = `KGC Logout: Your account was logged out at ${timestamp}. If this wasn't you, contact support immediately.`;
            
            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
            console.log(`Logout notification SMS sent to ${phoneNumber}.`);
            return { success: true };
        } catch (error) {
            console.error("Error sending logout notification SMS via Twilio:", error);
            return { success: false, error: (error as Error).message };
        }
    }
}

export const smsService = new SMSService();