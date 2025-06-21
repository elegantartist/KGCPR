import sendgrid from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the client on module load
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
    try {
        sendgrid.setApiKey(SENDGRID_API_KEY);
        console.log("SendGrid email service initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize SendGrid:", error);
    }
} else {
    console.warn("WARNING: SENDGRID_API_KEY is not configured. Email features will be disabled.");
}

interface EmailParams {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

interface TemplateEmailParams {
    to: string;
    subject: string;
    template: 'doctor_welcome' | 'patient_welcome' | 'logout_notification' | 'login_attempt' | 'reauth_challenge' | 'security_alert';
    placeholders: Record<string, string>;
    from?: string;
}

class EmailService {
    private defaultFrom = "welcome@keepgoingcare.com";
    private templatesPath = path.join(__dirname, '../email_templates');

    private loadTemplate(templateName: string): string {
        const templatePath = path.join(this.templatesPath, `${templateName}.html`);
        try {
            return fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            console.error(`Failed to load email template: ${templateName}`, error);
            throw new Error(`Email template ${templateName} not found`);
        }
    }

    private replacePlaceholders(html: string, placeholders: Record<string, string>): string {
        let processedHtml = html;
        Object.entries(placeholders).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
        });
        return processedHtml;
    }

    public async sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
        if (!SENDGRID_API_KEY) {
            const errorMsg = "Email service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        const msg = {
            to: params.to,
            from: params.from || this.defaultFrom,
            subject: params.subject,
            html: params.html,
        };

        try {
            await sendgrid.send(msg);
            console.log(`Email sent successfully to ${params.to}`);
            return { success: true };
        } catch (error: any) {
            console.error("Error sending email via SendGrid:", error);
            console.error("SendGrid error response:", error.response?.body);
            console.error("SendGrid error status:", error.code);
            console.error("SendGrid message payload:", JSON.stringify(msg, null, 2));
            return { success: false, error: error.message || "Unknown SendGrid error" };
        }
    }

    public async sendTemplateEmail(params: TemplateEmailParams): Promise<{ success: boolean; error?: string }> {
        if (!SENDGRID_API_KEY) {
            const errorMsg = "Email service is not configured.";
            console.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        try {
            const template = this.loadTemplate(params.template);
            const processedHtml = this.replacePlaceholders(template, params.placeholders);

            const msg = {
                to: params.to,
                from: params.from || this.defaultFrom,
                subject: params.subject,
                html: processedHtml,
            };

            await sendgrid.send(msg);
            console.log(`Template email (${params.template}) sent successfully to ${params.to}`);
            return { success: true };
        } catch (error: any) {
            console.error("Error sending template email via SendGrid:", error);
            console.error("SendGrid error response body:", JSON.stringify(error.response?.body, null, 2));
            console.error("SendGrid error status:", error.code);
            console.error("Template name:", params.template);
            console.error("Email payload:", JSON.stringify({
                to: params.to,
                from: params.from || this.defaultFrom,
                subject: params.subject
            }, null, 2));
            return { success: false, error: error.message || "Unknown SendGrid error" };
        }
    }

    public async sendDoctorWelcomeEmail(
        email: string,
        doctorName: string,
        dashboardLink: string
    ): Promise<{ success: boolean; error?: string }> {
        return this.sendTemplateEmail({
            to: email,
            subject: "Welcome to Keep Going Care - Access Your Dashboard",
            template: 'doctor_welcome',
            placeholders: {
                doctorName,
                dashboardLink
            }
        });
    }

    public async sendPatientWelcomeEmail(
        email: string,
        patientName: string,
        accessLink: string
    ): Promise<{ success: boolean; error?: string }> {
        // Load KGC logo from assets and convert to base64 data URL
        const logoPath = path.join(process.cwd(), 'attached_assets', 'KGCLogo_1749876495948.jpg');
        let kgcLogoBase64 = 'https://storage.googleapis.com/kgc-assets/KGCLogo.jpg'; // fallback
        
        try {
            const logoBuffer = fs.readFileSync(logoPath);
            kgcLogoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
            console.log('[DEBUG] KGC logo loaded successfully from assets, size:', logoBuffer.length, 'bytes');
        } catch (error) {
            console.warn('Could not load KGC logo from assets:', error, 'using fallback URL');
        }
        
        return this.sendTemplateEmail({
            to: email,
            subject: "Welcome to Your Health Journey with Keep Going Care",
            template: 'patient_welcome',
            placeholders: {
                patientName,
                accessLink,
                KGC_LOGO_BASE64: kgcLogoBase64
            }
        });
    }
}

export const emailService = new EmailService();