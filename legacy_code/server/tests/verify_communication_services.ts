import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';

async function testCommunicationServices() {
  console.log("--- Testing Communication Services ---");
  
  // Test email service (dry run - just check if it's configured)
  console.log("\n1. Testing Email Service Configuration:");
  try {
    // Test with a safe test email that won't actually send
    const emailResult = await emailService.sendEmail({
      to: "test@example.com",
      subject: "KGC Health Assistant - Service Test",
      html: "<p>This is a test email from your KGC Health Assistant.</p>"
    });
    
    if (emailResult.success) {
      console.log("✅ Email service is properly configured and functional");
    } else {
      console.log("❌ Email service error:", emailResult.error);
    }
  } catch (error) {
    console.log("❌ Email service failed:", (error as Error).message);
  }
  
  // Test SMS service (dry run - just check if it's configured)
  console.log("\n2. Testing SMS Service Configuration:");
  try {
    // Test with a test phone number
    const smsResult = await smsService.sendVerificationCode("+1234567890", "123456");
    
    if (smsResult.success) {
      console.log("✅ SMS service is properly configured and functional");
    } else {
      console.log("❌ SMS service error:", smsResult.error);
    }
  } catch (error) {
    console.log("❌ SMS service failed:", (error as Error).message);
  }
  
  console.log("\n--- Communication Services Test Complete ---");
}

// Run the test
testCommunicationServices().catch(console.error);