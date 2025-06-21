// Direct email sending script
import { emailService } from './server/services/emailService.js';

async function sendPatientWelcomeEmail() {
  try {
    console.log('Sending patient welcome email to Tom Jones...');
    
    const result = await emailService.sendPatientWelcomeEmail(
      'tom.jones@keepgoingcare.com',
      'Tom Jones',
      'http://localhost:5000/login'
    );
    
    console.log('Email sending result:', result);
    
    if (result.success) {
      console.log('✓ Patient welcome email sent successfully to Tom Jones');
    } else {
      console.log('✗ Failed to send email:', result.error);
    }
    
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendPatientWelcomeEmail();