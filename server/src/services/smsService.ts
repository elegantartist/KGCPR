import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error("Twilio environment variables are not set!");
}

// @ts-ignore - Twilio types can be complex, this is safe for our use case
const client = twilio(accountSid, authToken);

export const smsService = {
  async sendVerificationCode(phoneNumber: string, code: string) {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('SMS service is not configured on the server.');
    }

    try {
      const message = await client.messages.create({
        body: `Your Keep Going Care verification code is: ${code}`,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });
      console.log(`SMS sent successfully to ${phoneNumber}, SID: ${message.sid}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw new Error('Failed to send verification code via SMS.');
    }
  },
};