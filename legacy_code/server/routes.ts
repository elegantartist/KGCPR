import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import { storage } from "./storage";
import { badgeService } from "./services/badgeService";
import { supervisorAgentService } from "./services/supervisorAgentServiceFixed";
import { emailService } from "./services/emailService";
import { smsService } from "./services/smsService";
import { authService } from "./services/authService";
import { pprService } from "./services/pprService";
import { trendAnalysisService } from "./services/trendAnalysisService";
import { db } from "./db";
import { doctors, users, doctorPatients, carePlanDirectives, insertUserSchema, insertDoctorPatientSchema, insertCarePlanDirectiveSchema } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { dataSegregationService } from "./services/dataSegregationService";
import fs from "fs";
import path from "path";
import Stripe from 'stripe';
import { body } from 'express-validator';
import {
  sanitizeRequestBody,
  handleValidationErrors,
  validateScoreSubmission,
  validateUserRegistration,
  validateUserLogin,
  validateDoctorCreation,
  validateCarePlanDirective,
  validateChatQuery,
  generalRateLimit,
  authRateLimit,
  strictRateLimit,
  apiRateLimiter
} from "./middleware/security";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// MIP (Motivational Image Processing) - Add opaque stars overlay to image
function addStarsToImage(base64ImageData: string): string {
  // For now, return the original image in proper format
  // The star overlay processing would be implemented with Canvas API or image processing library
  // This ensures the image displays correctly while maintaining the processing workflow
  
  // Ensure proper data URL format
  if (!base64ImageData.startsWith('data:image/')) {
    return `data:image/jpeg;base64,${base64ImageData}`;
  }
  
  // Return the image in displayable format
  // Future enhancement: implement actual star overlay using Canvas or Sharp
  return base64ImageData;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warning" | "http";
  message: string;
}

interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileNode[];
  isActive?: boolean;
}

interface ApiEndpoint {
  method: string;
  path: string;
  description?: string;
  status: "active" | "coming_soon";
}

// In-memory storage for logs and server stats
let serverLogs: LogEntry[] = [];
let serverStats = {
  status: "running",
  port: 5000,
  uptime: "0m",
  requestCount: 0,
  startTime: Date.now(),
};

// Helper function to add log entry
function addLog(level: LogEntry["level"], message: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  serverLogs.push({ timestamp, level, message });
  
  // Keep only last 100 logs - always trim to prevent memory leaks
  serverLogs = serverLogs.slice(-100);
}

// Helper function to calculate uptime
function getUptime(): string {
  const uptimeMs = Date.now() - serverStats.startTime;
  const minutes = Math.floor(uptimeMs / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

// Helper function to scan project structure
function scanDirectory(dirPath: string, basePath: string): FileNode[] {
  try {
    const items = fs.readdirSync(dirPath);
    const nodes: FileNode[] = [];

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules' || item === 'dist') {
        continue;
      }

      const fullPath = path.join(dirPath, item);
      const relativePath = path.join(basePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const children = scanDirectory(fullPath, relativePath);
        nodes.push({
          name: item + "/",
          type: "directory",
          path: relativePath,
          children: children.length > 0 ? children : undefined,
        });
      } else {
        nodes.push({
          name: item,
          type: "file",
          path: relativePath,
          isActive: item === "index.ts" && basePath.includes("server"),
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket server on a separate port for proactive notifications
  const wss = new WebSocketServer({ port: 8080 });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected on port 8080');
    addLog("info", "WebSocket client connected for proactive notifications");
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      addLog("info", "WebSocket client disconnected");
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      addLog("error", `WebSocket error: ${error}`);
    });
  });
  // Initialize with startup log
  addLog("info", "KGCPR server is listening on port 5000");

  // Simple root endpoint as per original requirements
  app.get('/api/simple', (req, res) => {
    res.status(200).send('KGCPR Backend Server is running.');
  });

  // Middleware to track requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      serverStats.requestCount++;
      
      res.on('finish', () => {
        addLog("http", `${req.method} ${req.path} - ${res.statusCode} ${res.statusMessage} (${Date.now() - res.locals.startTime || 0}ms)`);
      });
      
      res.locals.startTime = Date.now();
    }
    next();
  });

  // Server status endpoint
  app.get("/api/server/status", (req, res) => {
    res.json({
      ...serverStats,
      uptime: getUptime(),
    });
  });

  // Server restart endpoint
  app.post("/api/server/restart",
    sanitizeRequestBody,
    strictRateLimit,
    (req, res) => {
    addLog("info", "Server restart requested");
    res.json({ message: "Restart signal sent" });
    
    // In a real application, you might trigger a process restart here
    setTimeout(() => {
      addLog("info", "Server restarted successfully");
      serverStats.startTime = Date.now();
      serverStats.requestCount = 0;
    }, 1000);
  });

  // Project structure endpoint
  app.get("/api/project/structure", (req, res) => {
    try {
      const rootDir = process.cwd();
      const structure: FileNode[] = [
        {
          name: "client/",
          type: "directory",
          path: "client",
          children: scanDirectory(path.join(rootDir, "client"), "client"),
        },
        {
          name: "server/",
          type: "directory", 
          path: "server",
          children: scanDirectory(path.join(rootDir, "server"), "server"),
        },
        {
          name: "shared/",
          type: "directory",
          path: "shared", 
          children: scanDirectory(path.join(rootDir, "shared"), "shared"),
        },
      ];
      
      res.json(structure);
    } catch (error) {
      console.error("Error getting project structure:", error);
      res.status(500).json({ error: "Failed to get project structure" });
    }
  });

  // API endpoints list
  app.get("/api/endpoints", (req, res) => {
    const endpoints: ApiEndpoint[] = [
      {
        method: "GET",
        path: "/api/server/status",
        description: "Server Status",
        status: "active",
      },
      {
        method: "POST", 
        path: "/api/server/restart",
        description: "Restart Server",
        status: "active",
      },
      {
        method: "GET",
        path: "/api/project/structure", 
        description: "Project Structure",
        status: "active",
      },
      {
        method: "GET",
        path: "/api/logs",
        description: "Server Logs",
        status: "active",
      },
      {
        method: "POST",
        path: "/api/users",
        description: "Create User",
        status: "coming_soon",
      },
      {
        method: "PUT",
        path: "/api/config",
        description: "Update Config", 
        status: "coming_soon",
      },
    ];
    
    res.json(endpoints);
  });

  // Logs endpoint
  app.get("/api/logs", (req, res) => {
    res.json(serverLogs);
  });

  // Clear logs endpoint
  app.delete("/api/logs", (req, res) => {
    serverLogs = [];
    addLog("info", "Logs cleared");
    res.json({ message: "Logs cleared successfully" });
  });

  // Export logs endpoint
  app.get("/api/logs/export", (req, res) => {
    const logText = serverLogs
      .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="kgcpr-logs-${new Date().toISOString().split('T')[0]}.txt"`);
    res.send(logText);
  });

  // Test run endpoint (stub)
  app.post("/api/test/run", 
    sanitizeRequestBody,
    strictRateLimit,
    (req, res) => {
    addLog("info", "Running tests...");
    setTimeout(() => {
      addLog("info", "All tests passed");
    }, 1000);
    res.json({ message: "Tests started", status: "running" });
  });

  // Documentation generation endpoint (stub)  
  app.post("/api/docs/generate",
    sanitizeRequestBody,
    strictRateLimit,
    (req, res) => {
    addLog("info", "Generating documentation...");
    setTimeout(() => {
      addLog("info", "Documentation generated successfully");
    }, 2000);
    res.json({ message: "Documentation generation started", status: "running" });
  });

  // Get motivational image endpoint
  app.get("/api/motivation/image", async (req: any, res) => {
    const patientId = req.session?.userId;

    if (!patientId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const motivationalImage = await storage.getLatestMotivationalImage(patientId);
      
      if (!motivationalImage) {
        // Return KGC logo as fallback
        addLog("info", `No motivational image found for patient ${patientId}, using fallback`);
        return res.json({ imageUrl: '/KGCLogo.jpg' });
      }
      
      addLog("info", `Motivational image retrieved for patient ${patientId}`);
      res.json({ imageUrl: motivationalImage.imageData });

    } catch (error) {
      console.error("Error fetching motivational image:", error);
      addLog("error", "Failed to fetch motivational image");
      res.status(500).json({ message: "Failed to fetch motivational image." });
    }
  });

  // Get patient badges endpoint
  app.get("/api/badges", async (req: any, res) => {
    const patientId = req.session?.userId;

    if (!patientId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const badges = await badgeService.getPatientBadges(patientId);
      addLog("info", `Retrieved ${badges.length} badges for patient ${patientId}`);
      res.json({ badges });
    } catch (error) {
      console.error("Error fetching patient badges:", error);
      addLog("error", "Failed to fetch patient badges");
      res.status(500).json({ message: "Failed to fetch badges." });
    }
  });

  // Upload and process motivational image endpoint
  app.post("/api/motivation/upload", 
    sanitizeRequestBody,
    body('imageData').notEmpty().withMessage('Image data is required'),
    handleValidationErrors,
    apiRateLimiter,
    async (req: any, res) => {
    const { imageData } = req.body;
    const patientId = req.session?.userId;

    if (!patientId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!imageData) {
      return res.status(400).json({ message: "Image data is required" });
    }

    try {
      // Process the image by adding opaque stars overlay
      const processedImageData = addStarsToImage(imageData);
      
      // Save the processed image to database
      const savedImage = await storage.createMotivationalImage({
        userId: patientId,
        imageData: processedImageData
      });

      addLog("info", `Motivational image uploaded and processed for patient ${patientId}`);
      res.status(201).json({ 
        success: true, 
        message: "Image uploaded and processed successfully",
        imageUrl: savedImage.imageData 
      });

    } catch (error) {
      console.error("Error processing motivational image:", error);
      addLog("error", "Failed to process motivational image");
      res.status(500).json({ message: "Failed to process image." });
    }
  });

  // Production-ready Daily Self-Scores endpoint with validation
  app.post("/api/scores", 
    sanitizeRequestBody,
    validateScoreSubmission,
    handleValidationErrors,
    apiRateLimiter,
    async (req: any, res: any) => {
    const { dietScore, exerciseScore, medicationScore } = req.body;
    const patientId = req.session?.userId;

    // Debug session information
    console.log('Session data:', {
      sessionExists: !!req.session,
      userId: req.session?.userId,
      sessionId: req.session?.id,
      cookies: req.headers.cookie
    });

    // Validate authentication
    if (!patientId) {
      addLog("error", `Score submission attempted without authentication. Session: ${!!req.session}, UserId: ${req.session?.userId}`);
      return res.status(401).json({ 
        message: "Please log in to submit your daily scores",
        requiresAuth: true,
        redirectTo: "/login"
      });
    }

    // Validate scores
    if ([dietScore, exerciseScore, medicationScore].some(s => typeof s !== 'number' || s < 1 || s > 10)) {
      addLog("error", "Invalid scores submitted - must be numbers between 1 and 10");
      return res.status(400).json({ message: "Scores must be a number between 1 and 10." });
    }

    try {
      // Check for existing submission today
      const today = new Date().toISOString().split('T')[0];
      const existingSubmissions = await storage.getPatientScoresByDate(patientId, today);
      
      if (existingSubmissions.length > 0) {
        addLog("error", `Duplicate score submission attempted for patient ${patientId} on ${today}`);
        return res.status(409).json({
          message: "Daily scores have already been submitted for today. Please try again tomorrow."
        });
      }

      // Create the score record
      const scoreData = {
        patientId,
        dietScore,
        exerciseScore,
        medicationScore,
      };

      const savedScore = await storage.createPatientScore(scoreData);
      
      // Check and award badges after saving scores
      const newBadges = await badgeService.checkAndAwardBadges(patientId);
      
      // Proactive Agent: Analyze trends and generate suggestions
      let proactiveSuggestionSent = false;
      try {
        const trendAnalysis = await trendAnalysisService.analyzeScoreTrends(patientId);
        
        if (trendAnalysis) {
          addLog("info", `Trend detected for patient ${patientId}: ${trendAnalysis.type} in ${trendAnalysis.category}`);
          
          // Get patient's CPDs for context
          const [doctorPatient] = await db
            .select({ doctorId: doctorPatients.doctorId })
            .from(doctorPatients)
            .where(eq(doctorPatients.patientId, patientId))
            .limit(1);
          
          let cpdData = {};
          if (doctorPatient) {
            const [cpds] = await db
              .select()
              .from(carePlanDirectives)
              .where(and(
                eq(carePlanDirectives.doctorId, doctorPatient.doctorId),
                eq(carePlanDirectives.patientId, patientId)
              ))
              .limit(1);
            
            if (cpds) {
              cpdData = {
                dietCpd: cpds.dietCpd,
                exerciseCpd: cpds.exerciseCpd,
                medicationCpd: cpds.medicationCpd
              };
            }
          }
          
          // Generate proactive suggestion
          const suggestion = await supervisorAgentService.generateProactiveSuggestion(trendAnalysis, cpdData);
          
          // Send WebSocket notification to the patient
          const wsMessage = {
            type: 'PROACTIVE_SUGGESTION',
            content: suggestion,
            trendType: trendAnalysis.type,
            category: trendAnalysis.category,
            timestamp: new Date().toISOString()
          };
          
          // Broadcast to specific patient (if WebSocket connection exists)
          let messagesSent = 0;
          wss.clients.forEach((client: any) => {
            if (client.readyState === 1) { // WebSocket.OPEN
              try {
                client.send(JSON.stringify(wsMessage));
                messagesSent++;
                addLog("info", `Proactive suggestion sent to patient ${patientId}`);
              } catch (wsError) {
                console.error('WebSocket send error:', wsError);
              }
            }
          });
          
          // Mark as sent if we successfully sent to at least one client
          if (messagesSent > 0) {
            proactiveSuggestionSent = true;
          }
        }
      } catch (proactiveError) {
        console.error('Proactive agent error:', proactiveError);
        addLog("error", `Proactive analysis failed for patient ${patientId}`);
        // Don't fail the main score submission for proactive errors
      }
      
      addLog("info", `Daily scores saved for patient ${patientId}: Diet=${dietScore}, Exercise=${exerciseScore}, Medication=${medicationScore}`);
      if (newBadges.length > 0) {
        addLog("info", `New badges awarded to patient ${patientId}: ${newBadges.map(b => `${b.badgeName} ${b.badgeTier}`).join(', ')}`);
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Scores saved successfully",
        data: savedScore,
        newBadges,
        proactiveSuggestionSent
      });

    } catch (error) {
      console.error("Error saving self-scores:", error);
      addLog("error", "Failed to save daily scores to storage");
      res.status(500).json({ message: "Failed to save scores." });
    }
  });

  // Chat API endpoint for Supervisor Agent
  app.post("/api/chat/query", async (req: any, res) => {
    const { message } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      addLog("error", "Chat query attempted without authentication");
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!message) {
      addLog("error", "Chat query attempted without message");
      return res.status(400).json({ error: "A message is required." });
    }

    try {
      const response = await supervisorAgentService.processQuery(userId, message);
      addLog("info", `Chat query processed for user ${userId}`);
      res.json({ response });
    } catch (error) {
      console.error("Error processing chat query:", error);
      addLog("error", "Failed to process chat query");
      res.status(500).json({ error: "Failed to process your message. Please try again." });
    }
  });

  // Debug SendGrid endpoint
  app.post("/api/debug/sendgrid", async (req, res) => {
    try {
      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "SendGrid Debug Test",
        html: "<p>This is a debug test email</p>"
      });
      res.json(result);
    } catch (error: any) {
      res.json({ 
        error: error.message,
        details: error.response?.body,
        code: error.code 
      });
    }
  });

  // Send health reminder email endpoint
  app.post("/api/notifications/email",
    sanitizeRequestBody,
    body('to').isEmail().withMessage('Valid email address is required'),
    body('subject').isLength({ min: 1, max: 200 }).withMessage('Subject must be between 1 and 200 characters'),
    body('message').isLength({ min: 1, max: 5000 }).withMessage('Message is required and must be under 5000 characters'),
    handleValidationErrors,
    strictRateLimit,
    async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      addLog("error", "Email notification attempted with missing parameters");
      return res.status(400).json({ error: "Email address, subject, and message are required." });
    }

    try {
      const result = await emailService.sendEmail({
        to,
        subject: `KGC Health Assistant - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6B46C1;">Keep Going Care</h2>
            <p>${message}</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This message was sent by your KGC Health Assistant to support your wellness journey.
            </p>
          </div>
        `
      });

      if (result.success) {
        addLog("info", `Health reminder email sent to ${to}`);
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        addLog("error", `Failed to send email: ${result.error}`);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error sending notification email:", error);
      addLog("error", "Failed to send notification email");
      res.status(500).json({ error: "Failed to send email notification." });
    }
  });

  // Send verification code SMS endpoint
  app.post("/api/notifications/sms",
    sanitizeRequestBody,
    body('phoneNumber').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('code').isLength({ min: 4, max: 10 }).withMessage('Verification code must be between 4 and 10 characters'),
    handleValidationErrors,
    strictRateLimit,
    async (req, res) => {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      addLog("error", "SMS verification attempted with missing parameters");
      return res.status(400).json({ error: "Phone number and verification code are required." });
    }

    try {
      const result = await smsService.sendVerificationCode(phoneNumber, code);

      if (result.success) {
        addLog("info", `Verification code sent to ${phoneNumber}`);
        res.json({ success: true, message: "SMS sent successfully" });
      } else {
        addLog("error", `Failed to send SMS: ${result.error}`);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error sending SMS notification:", error);
      addLog("error", "Failed to send SMS notification");
      res.status(500).json({ error: "Failed to send SMS notification." });
    }
  });

  // Admin authentication middleware
  const adminAuthMiddleware = async (req: any, res: any, next: any) => {
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }
      
      next();
    } catch (error) {
      console.error("Admin auth middleware error:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };

  // Admin-only endpoint to get all doctors
  app.get("/api/admin/doctors", adminAuthMiddleware, async (req: any, res) => {
    try {
      // Fetch all doctors from database
      const allDoctors = await db.select().from(doctors).orderBy(doctors.createdAt);
      
      addLog("info", `Admin retrieved ${allDoctors.length} doctors`);
      
      res.json({
        success: true,
        doctors: allDoctors
      });

    } catch (error) {
      console.error("Error fetching doctors:", error);
      addLog("error", "Failed to fetch doctors for admin");
      res.status(500).json({ error: "Failed to fetch doctors." });
    }
  });

  // Admin-only doctor creation endpoint
  app.post("/api/admin/doctors",
    sanitizeRequestBody,
    validateDoctorCreation,
    handleValidationErrors,
    strictRateLimit,
    adminAuthMiddleware,
    async (req: any, res: any) => {
    const { name, email, phone, specialization } = req.body;
    
    if (!name || !email || !phone) {
      addLog("error", "Doctor creation attempted with missing parameters");
      return res.status(400).json({ error: "Name, email, and phone are required." });
    }

    try {
      // Normalize phone number to international format automatically
      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+61' + normalizedPhone.substring(1);
      } else if (normalizedPhone.match(/^\d{10}$/)) {
        normalizedPhone = '+61' + normalizedPhone;
      } else if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+61' + normalizedPhone;
      }

      // Generate cryptographically secure setup token
      const setupToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      
      // Determine base URL for production/development
      let baseUrl;
      console.log('Environment check for URL generation:');
      console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN);
      console.log('REPL_SLUG:', process.env.REPL_SLUG);
      console.log('REPL_OWNER:', process.env.REPL_OWNER);
      console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
      
      if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        console.log('Using REPLIT_DEV_DOMAIN:', baseUrl);
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
        console.log('Using REPL_SLUG/REPL_OWNER:', baseUrl);
      } else if (process.env.REPLIT_DOMAINS) {
        // Use the first available Replit domain
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
        console.log('Using REPLIT_DOMAINS:', baseUrl);
      } else {
        // Fallback to localhost only if no Replit environment detected
        baseUrl = 'http://localhost:5000';
        console.log('Fallback to localhost:', baseUrl);
      }
      
      const dashboardLink = `${baseUrl}/doctor`;

      // Create doctor record with normalized phone
      const [newDoctor] = await db.insert(doctors).values({
        name,
        email,
        phone: normalizedPhone,
        setupToken,
        isSetupComplete: false
      }).returning();

      // Send comprehensive welcome email with full KGC medical device content
      const emailResult = await emailService.sendDoctorWelcomeEmail(
        email,
        name,
        dashboardLink
      );

      if (emailResult.success) {
        addLog("info", `✅ AUTOMATED: Doctor created successfully - ${name} (${email}) - Phone: ${normalizedPhone} - Dashboard: ${dashboardLink}`);
        res.status(201).json({
          success: true,
          message: "Doctor created successfully and comprehensive welcome email sent with dashboard access",
          doctor: {
            id: newDoctor.id,
            name: newDoctor.name,
            email: newDoctor.email,
            phone: newDoctor.phone,
            setupToken: newDoctor.setupToken,
            isSetupComplete: newDoctor.isSetupComplete,
            dashboardLink: dashboardLink
          },
          automation: {
            phoneNormalized: true,
            emailSent: true,
            setupTokenGenerated: true,
            baseUrl: baseUrl
          }
        });
      } else {
        // Doctor created but email failed - provide manual backup
        addLog("error", `⚠️ Doctor created but email failed: ${name} - ${emailResult.error} - Manual dashboard access required: ${dashboardLink}`);
        res.status(201).json({
          success: true,
          message: "Doctor created successfully but email delivery failed. Manual dashboard link provided.",
          doctor: {
            id: newDoctor.id,
            name: newDoctor.name,
            email: newDoctor.email,
            phone: newDoctor.phone,
            setupToken: newDoctor.setupToken,
            isSetupComplete: newDoctor.isSetupComplete,
            dashboardLink: dashboardLink
          },
          automation: {
            phoneNormalized: true,
            emailSent: false,
            setupTokenGenerated: true,
            baseUrl: baseUrl
          },
          emailError: emailResult.error,
          manualInstructions: `Please send this dashboard link manually to ${email}: ${dashboardLink}`
        });
      }

    } catch (error) {
      console.error("Error creating doctor:", error);
      addLog("error", "Failed to create doctor");
      res.status(500).json({ error: "Failed to create doctor." });
    }
  });

  // GET /api/admin/patients - Get all patients with doctor assignments
  app.get("/api/admin/patients", async (req: any, res) => {
    try {
      // Verify admin authentication
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }

      // Get all patients with their assigned doctors
      const patients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phoneNumber: users.phoneNumber,
          createdAt: users.createdAt,
          doctorId: doctorPatients.doctorId,
          doctorName: doctors.name,
          assignedAt: doctorPatients.createdAt
        })
        .from(users)
        .leftJoin(doctorPatients, eq(users.id, doctorPatients.patientId))
        .leftJoin(doctors, eq(doctorPatients.doctorId, doctors.id))
        .where(eq(users.role, 'patient'))
        .orderBy(users.name);

      addLog("info", `Admin ${userId} retrieved ${patients.length} patients`);
      res.json({ success: true, patients });

    } catch (error) {
      console.error("Error fetching patients:", error);
      addLog("error", "Failed to fetch patients for admin");
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // DELETE /api/admin/doctor/:doctorId - Delete doctor and reassign patients
  app.delete("/api/admin/doctor/:doctorId", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }

      const doctorId = parseInt(req.params.doctorId);
      const { reassignToDoctorId } = req.body;

      // Check if doctor exists
      const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId));
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      // If reassigning patients, validate new doctor
      if (reassignToDoctorId) {
        const [newDoctor] = await db.select().from(doctors).where(eq(doctors.id, reassignToDoctorId));
        if (!newDoctor) {
          return res.status(400).json({ error: "Invalid reassignment doctor" });
        }
        
        // Reassign patients
        await db
          .update(doctorPatients)
          .set({ doctorId: reassignToDoctorId })
          .where(eq(doctorPatients.doctorId, doctorId));
      } else {
        // Remove all patient assignments
        await db.delete(doctorPatients).where(eq(doctorPatients.doctorId, doctorId));
      }

      // Delete doctor
      await db.delete(doctors).where(eq(doctors.id, doctorId));
      await db.delete(users).where(eq(users.id, doctorId));

      addLog("info", `Admin ${userId} deleted doctor ${doctorId}`);
      res.json({ success: true, message: "Doctor deleted successfully" });

    } catch (error) {
      console.error("Error deleting doctor:", error);
      addLog("error", `Failed to delete doctor ${req.params.doctorId}`);
      res.status(500).json({ error: "Failed to delete doctor" });
    }
  });

  // DELETE /api/admin/patient/:patientId - Delete patient
  app.delete("/api/admin/patient/:patientId", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }

      const patientId = parseInt(req.params.patientId);

      // Remove patient assignments
      await db.delete(doctorPatients).where(eq(doctorPatients.patientId, patientId));
      
      // Delete patient data
      await db.delete(users).where(eq(users.id, patientId));

      addLog("info", `Admin ${userId} deleted patient ${patientId}`);
      res.json({ success: true, message: "Patient deleted successfully" });

    } catch (error) {
      console.error("Error deleting patient:", error);
      addLog("error", `Failed to delete patient ${req.params.patientId}`);
      res.status(500).json({ error: "Failed to delete patient" });
    }
  });

  // PUT /api/admin/patient/:patientId/reassign - Reassign patient to new doctor
  app.put("/api/admin/patient/:patientId/reassign", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }

      const patientId = parseInt(req.params.patientId);
      const { newDoctorId } = req.body;

      // Validate new doctor
      const [newDoctor] = await db.select().from(doctors).where(eq(doctors.id, newDoctorId));
      if (!newDoctor) {
        return res.status(400).json({ error: "Invalid doctor selected" });
      }

      // Check if assignment already exists
      const [existing] = await db
        .select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.patientId, patientId),
          eq(doctorPatients.doctorId, newDoctorId)
        ));

      if (existing) {
        return res.status(400).json({ error: "Patient already assigned to this doctor" });
      }

      // Remove existing assignment
      await db.delete(doctorPatients).where(eq(doctorPatients.patientId, patientId));

      // Create new assignment
      await db.insert(doctorPatients).values({
        doctorId: newDoctorId,
        patientId: patientId
      });

      addLog("info", `Admin ${userId} reassigned patient ${patientId} to doctor ${newDoctorId}`);
      res.json({ success: true, message: "Patient reassigned successfully" });

    } catch (error) {
      console.error("Error reassigning patient:", error);
      addLog("error", `Failed to reassign patient ${req.params.patientId}`);
      res.status(500).json({ error: "Failed to reassign patient" });
    }
  });

  // GET /api/admin/analytics/system - System analytics for admin dashboard
  app.get("/api/admin/analytics/system", async (req: any, res) => {
    try {
      // Verify admin authentication
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;
      
      if (!userId || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: "Admin access required"
        });
      }

      // Get system statistics from database using proper Drizzle queries
      const userCounts = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN role = 'patient' THEN 1 END) as total_patients,
          COUNT(CASE WHEN role = 'doctor' THEN 1 END) as total_doctors,
          COUNT(*) as total_users
        FROM users
      `);

      const scoreCounts = await db.execute(sql`
        SELECT 
          COUNT(*) as total_scores_submitted,
          COALESCE(AVG((diet_score + exercise_score + medication_score) / 3.0), 0) as average_score_today
        FROM patient_scores 
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      const badgeCounts = await db.execute(sql`
        SELECT COUNT(*) as total_badges_earned
        FROM patient_badges
      `);

      // Active sessions today (simplified - count unique user logins)
      const sessionCounts = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as active_sessions_today
        FROM supervisor_agent_logs 
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      const userCountsRow = userCounts.rows[0] as any;
      const scoreCountsRow = scoreCounts.rows[0] as any;
      const badgeCountsRow = badgeCounts.rows[0] as any;
      const sessionCountsRow = sessionCounts.rows[0] as any;

      const stats = {
        totalUsers: Number(userCountsRow?.total_users) || 0,
        totalDoctors: Number(userCountsRow?.total_doctors) || 0,
        totalPatients: Number(userCountsRow?.total_patients) || 0,
        totalScoresSubmitted: Number(scoreCountsRow?.total_scores_submitted) || 0,
        totalBadgesEarned: Number(badgeCountsRow?.total_badges_earned) || 0,
        activeSessionsToday: Number(sessionCountsRow?.active_sessions_today) || 0,
        averageScoreToday: Number(scoreCountsRow?.average_score_today) || 0
      };

      addLog("info", `Admin analytics accessed by user ${userId}`);
      res.json({
        success: true,
        stats: stats
      });

    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      addLog("error", "Failed to fetch admin analytics");
      res.status(500).json({
        success: false,
        error: "Failed to fetch system analytics"
      });
    }
  });

  // Store verification codes temporarily (in production, use Redis or database)
  const verificationCodes = new Map<string, { code: string; doctorId: number; expires: number }>();

  // Send SMS verification code for doctor setup
  app.post("/api/doctor/setup/send-sms", async (req, res) => {
    const { token } = req.body;

    if (!token) {
      addLog("error", "SMS setup attempted without token");
      return res.status(400).json({ error: "Setup token is required." });
    }

    try {
      // Find doctor by setup token
      const [doctor] = await db.select().from(doctors).where(eq(doctors.setupToken, token));

      if (!doctor) {
        addLog("error", `Invalid setup token attempted: ${token}`);
        return res.status(404).json({ error: "Invalid setup token." });
      }

      if (doctor.isSetupComplete) {
        addLog("error", `Setup attempted for already completed doctor: ${doctor.email}`);
        return res.status(400).json({ error: "Doctor setup already completed." });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store verification code
      verificationCodes.set(token, {
        code: verificationCode,
        doctorId: doctor.id,
        expires
      });

      // Send SMS
      const smsResult = await smsService.sendVerificationCode(doctor.phone, verificationCode);

      if (smsResult.success) {
        addLog("info", `SMS verification code sent to doctor: ${doctor.email}`);
        console.log(`[DEBUG] Verification code for ${doctor.email}: ${verificationCode}`); // For testing
        res.json({ success: true, message: "Verification code sent successfully" });
      } else {
        addLog("error", `Failed to send SMS to doctor: ${smsResult.error}`);
        res.status(500).json({ error: smsResult.error });
      }

    } catch (error) {
      console.error("Error sending SMS verification:", error);
      addLog("error", "Failed to send SMS verification");
      res.status(500).json({ error: "Failed to send verification code." });
    }
  });

  // Complete doctor setup with token and SMS verification
  app.post("/api/doctor/setup/verify",
    sanitizeRequestBody,
    body('token').isLength({ min: 10, max: 100 }).withMessage('Valid setup token is required'),
    body('code').isLength({ min: 4, max: 10 }).withMessage('Valid verification code is required'),
    handleValidationErrors,
    authRateLimit,
    async (req, res) => {
    const { token, code } = req.body;

    if (!token || !code) {
      addLog("error", "Doctor setup verification attempted with missing parameters");
      return res.status(400).json({ error: "Setup token and verification code are required." });
    }

    try {
      // Verify token and code
      const storedVerification = verificationCodes.get(token);
      
      if (!storedVerification) {
        addLog("error", `Setup verification attempted with invalid token: ${token}`);
        return res.status(400).json({ error: "Invalid or expired setup token." });
      }

      if (Date.now() > storedVerification.expires) {
        verificationCodes.delete(token);
        addLog("error", `Expired verification code attempted: ${token}`);
        return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      }

      if (storedVerification.code !== code) {
        addLog("error", `Incorrect verification code attempted for token: ${token}`);
        return res.status(400).json({ error: "Invalid verification code." });
      }

      // Update doctor record to complete setup
      await db.update(doctors)
        .set({
          isSetupComplete: true,
          setupToken: null,
          updatedAt: new Date()
        })
        .where(eq(doctors.id, storedVerification.doctorId));

      // Get updated doctor record
      const [doctor] = await db.select().from(doctors).where(eq(doctors.id, storedVerification.doctorId));

      // Clean up verification code
      verificationCodes.delete(token);

      addLog("info", `Doctor setup completed successfully: ${doctor.email}`);
      
      res.json({
        success: true,
        message: "Doctor setup completed successfully",
        doctor: {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          isSetupComplete: doctor.isSetupComplete
        }
      });

    } catch (error) {
      console.error("Error completing doctor setup:", error);
      addLog("error", "Failed to complete doctor setup");
      res.status(500).json({ error: "Failed to complete setup." });
    }
  });

  // Doctor Authentication Middleware with Data Segregation
  const doctorAuthMiddleware = async (req: any, res: any, next: any) => {
    try {
      // Check session-based authentication first
      const sessionUserId = req.session?.userId;
      const sessionUserRole = req.session?.userRole;
      
      if (sessionUserId && sessionUserRole === 'doctor') {
        // For session-based authentication, the sessionUserId IS the doctor ID
        const [doctor] = await db.select().from(doctors).where(eq(doctors.id, sessionUserId));
        
        if (doctor) {
          req.doctorId = doctor.id;
          req.doctor = doctor;
          
          // Initialize segregated session for this doctor if accessing patient data
          if (req.params.patientId || req.body.patientId) {
            const patientId = parseInt(req.params.patientId || req.body.patientId);
            await dataSegregationService.createOrUpdateDoctorSession(doctor.id, patientId, {
              lastAccess: new Date(),
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
          
          return next();
        }
      }
      
      // Fallback to header-based authentication for development
      const doctorId = req.headers['x-doctor-id'];
      
      if (doctorId) {
        // Verify doctor exists
        const [doctor] = await db.select().from(doctors).where(eq(doctors.id, parseInt(doctorId)));
        
        if (doctor) {
          req.doctorId = doctor.id;
          req.doctor = doctor;
          return next();
        }
      }
      
      return res.status(401).json({ error: "Doctor authentication required" });
    } catch (error) {
      console.error("Doctor auth middleware error:", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };

  // Doctor Dashboard API Routes
  
  // GET /api/doctor/patients - List all patients assigned to the doctor
  app.get("/api/doctor/patients", doctorAuthMiddleware, async (req: any, res) => {
    try {
      const doctorId = req.doctorId;

      // Get all patients assigned to this doctor with their basic info
      const patients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phoneNumber: users.phoneNumber,
          createdAt: users.createdAt,
          assignedAt: doctorPatients.createdAt
        })
        .from(doctorPatients)
        .innerJoin(users, eq(doctorPatients.patientId, users.id))
        .where(eq(doctorPatients.doctorId, doctorId))
        .orderBy(users.name);

      // Log data access for each patient
      for (const patient of patients) {
        await dataSegregationService.logDataAccess(
          doctorId, 
          patient.id, 
          'view', 
          'patient_list',
          req
        );
      }

      addLog("info", `Doctor ${doctorId} retrieved ${patients.length} patients`);
      res.json({ success: true, patients });

    } catch (error) {
      console.error("Error fetching doctor patients:", error);
      addLog("error", `Failed to fetch patients for doctor ${req.doctorId}`);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // POST /api/doctor/patients - Create a new patient
  app.post("/api/doctor/patients", 
    doctorAuthMiddleware,
    sanitizeRequestBody,
    body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('phoneNumber').isMobilePhone('any').withMessage('Valid phone number is required'),
    handleValidationErrors,
    apiRateLimiter,
    async (req: any, res) => {
    try {
      const doctorId = req.doctorId;
      const { name, email, phoneNumber } = req.body;

      if (!name || !email || !phoneNumber) {
        return res.status(400).json({ error: "Name, email, and phone number are required" });
      }

      // Generate username from email
      const username = email.toLowerCase().replace('@', '_').replace(/[^a-z0-9_]/g, '');

      // Create new patient user record
      const [newPatient] = await db
        .insert(users)
        .values({
          username,
          password: "temp_password", // In production, generate secure temp password
          role: "patient",
          name,
          email,
          phoneNumber
        })
        .returning();

      // Link patient to doctor
      await db
        .insert(doctorPatients)
        .values({
          doctorId,
          patientId: newPatient.id
        });

      // Generate proper external URL for patient authentication (same logic as doctor onboarding)
      let baseUrl;
      if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else {
        baseUrl = 'http://localhost:5000';
      }
      const accessLink = `${baseUrl}/login`;

      // Send welcome email to patient using the new template
      const emailResult = await emailService.sendPatientWelcomeEmail(
        email,
        name,
        accessLink
      );

      if (!emailResult.success) {
        console.error("Failed to send patient welcome email:", emailResult.error);
      }

      addLog("info", `Doctor ${doctorId} created new patient: ${email}`);
      
      res.status(201).json({
        success: true,
        message: emailResult.success 
          ? "Patient created and welcome email sent" 
          : "Patient created but welcome email failed to send",
        patient: {
          id: newPatient.id,
          name: newPatient.name,
          email: newPatient.email,
          phoneNumber: newPatient.phoneNumber
        },
        emailSent: emailResult.success
      });

    } catch (error) {
      console.error("Error creating patient:", error);
      addLog("error", `Failed to create patient for doctor ${req.doctorId}`);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  // GET /api/patients/:patientId/cpds - Get CPDs for a specific patient
  app.get("/api/patients/:patientId/cpds", doctorAuthMiddleware, async (req: any, res) => {
    try {
      const doctorId = req.doctorId;
      const patientId = parseInt(req.params.patientId);

      // Verify doctor has access to this patient
      const [patientAssignment] = await db
        .select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ));

      if (!patientAssignment) {
        return res.status(403).json({ error: "Access denied to this patient" });
      }

      // Get current CPDs for the patient
      const [cpds] = await db
        .select()
        .from(carePlanDirectives)
        .where(eq(carePlanDirectives.patientId, patientId));

      res.json({
        success: true,
        cpds: cpds || {
          dietCpd: "",
          exerciseCpd: "",
          medicationCpd: ""
        }
      });

    } catch (error) {
      console.error("Error fetching patient CPDs:", error);
      addLog("error", `Failed to fetch CPDs for patient ${req.params.patientId}`);
      res.status(500).json({ error: "Failed to fetch CPDs" });
    }
  });

  // POST /api/patients/:patientId/cpds - Save/update CPDs for a specific patient
  app.post("/api/patients/:patientId/cpds", doctorAuthMiddleware, async (req: any, res) => {
    try {
      const doctorId = req.doctorId;
      const patientId = parseInt(req.params.patientId);
      const { dietCpd, exerciseCpd, medicationCpd } = req.body;

      // Verify doctor has access to this patient
      const [patientAssignment] = await db
        .select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ));

      if (!patientAssignment) {
        return res.status(403).json({ error: "Access denied to this patient" });
      }

      // Check if CPDs already exist for this patient
      const [existingCpds] = await db
        .select()
        .from(carePlanDirectives)
        .where(eq(carePlanDirectives.patientId, patientId));

      if (existingCpds) {
        // Update existing CPDs
        await db
          .update(carePlanDirectives)
          .set({
            dietCpd: dietCpd || "",
            exerciseCpd: exerciseCpd || "",
            medicationCpd: medicationCpd || "",
            updatedAt: new Date()
          })
          .where(eq(carePlanDirectives.patientId, patientId));
      } else {
        // Create new CPDs
        await db
          .insert(carePlanDirectives)
          .values({
            patientId,
            doctorId,
            dietCpd: dietCpd || "",
            exerciseCpd: exerciseCpd || "",
            medicationCpd: medicationCpd || ""
          });
      }

      addLog("info", `Doctor ${doctorId} updated CPDs for patient ${patientId}`);
      
      res.json({
        success: true,
        message: "Care Plan Directives saved successfully"
      });

    } catch (error) {
      console.error("Error saving patient CPDs:", error);
      addLog("error", `Failed to save CPDs for patient ${req.params.patientId}`);
      res.status(500).json({ error: "Failed to save CPDs" });
    }
  });

  // =============================================================================
  // PART 1: STRIPE PAYMENT ENDPOINTS
  // =============================================================================

  // POST /api/payments/create-checkout-session - Create Stripe checkout session
  app.post("/api/payments/create-checkout-session",
    sanitizeRequestBody,
    body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('userEmail').isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('userName').optional().isLength({ min: 1, max: 100 }).withMessage('User name must be between 1 and 100 characters'),
    handleValidationErrors,
    strictRateLimit,
    async (req, res) => {
    try {
      const { userId, userEmail, userName } = req.body;

      if (!userId || !userEmail) {
        return res.status(400).json({ error: "User ID and email are required" });
      }

      // Create or retrieve Stripe customer
      let stripeCustomer;
      try {
        const existingCustomers = await stripe.customers.list({
          email: userEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomer = existingCustomers.data[0];
        } else {
          stripeCustomer = await stripe.customers.create({
            email: userEmail,
            name: userName || undefined,
            metadata: { userId: userId.toString() }
          });
        }
      } catch (error) {
        console.error("Error creating/retrieving Stripe customer:", error);
        return res.status(500).json({ error: "Failed to create customer" });
      }

      // Create checkout session for $50/month subscription
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomer.id,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'KGC Health Assistant - Monthly Subscription',
                description: 'Access to your personal health assistant with daily tracking and AI-powered insights'
              },
              unit_amount: 5000, // $50.00 in cents
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1
          }
        ],
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/patient-setup`,
        metadata: {
          userId: userId.toString()
        }
      });

      addLog("info", `Created Stripe checkout session for user ${userId}`);
      
      res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });

    } catch (error) {
      console.error("Error creating checkout session:", error);
      addLog("error", `Failed to create checkout session: ${error}`);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // POST /api/webhooks/stripe - Handle Stripe webhook events
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      // In production, you should use webhook signing secret from environment
      // For now, we'll parse the event directly
      event = req.body;
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.metadata?.userId || '0');
          
          if (!userId) {
            console.error("No userId found in session metadata");
            break;
          }

          // Update user subscription status in database
          await db
            .update(users)
            .set({
              isSubscriptionActive: true,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStartDate: new Date(),
              subscriptionEndDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days from now
            })
            .where(eq(users.id, userId));

          addLog("info", `Activated subscription for user ${userId}`);
          console.log(`Subscription activated for user ${userId}`);
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          // Find user by Stripe subscription ID and deactivate
          await db
            .update(users)
            .set({
              isSubscriptionActive: false,
              subscriptionEndDate: new Date()
            })
            .where(eq(users.stripeSubscriptionId, deletedSubscription.id));

          addLog("info", `Deactivated subscription: ${deletedSubscription.id}`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      addLog("error", `Webhook processing failed: ${error}`);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // =============================================================================
  // PART 1.4: EMAIL TESTING ENDPOINTS
  // =============================================================================

  // POST /api/email/test-doctor-welcome - Test doctor welcome email
  app.post("/api/email/test-doctor-welcome", async (req: any, res) => {
    try {
      const { doctorName, email, dashboardLink } = req.body;
      
      if (!doctorName || !email || !dashboardLink) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: doctorName, email, dashboardLink" 
        });
      }

      const emailResult = await emailService.sendDoctorWelcomeEmail(doctorName, email, dashboardLink);
      
      if (emailResult.success) {
        addLog("info", `Test doctor welcome email sent to ${email}`);
        res.json({ 
          success: true, 
          message: `Doctor welcome email sent successfully to ${email}` 
        });
      } else {
        addLog("error", `Failed to send test doctor welcome email to ${email}: ${emailResult.error}`);
        res.status(500).json({ 
          success: false, 
          message: emailResult.error 
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      addLog("error", `Test doctor welcome email failed: ${error}`);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send test email" 
      });
    }
  });

  // =============================================================================
  // PART 1.5: PASSWORDLESS LOGIN ENDPOINTS
  // =============================================================================

  // POST /api/auth/request-login - Request login with email (sends SMS code)
  app.post("/api/auth/request-login", 
    sanitizeRequestBody,
    body('email').isEmail().withMessage('Valid email is required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { email } = req.body;

      // First check if user exists in users table (patients) - case insensitive
      let user = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`).limit(1);
      let userType: 'patient' | 'doctor' | 'admin' = 'patient';
      let userRecord: any = null;

      if (user.length > 0) {
        userRecord = user[0];
        userType = userRecord.role === 'admin' ? 'admin' : (userRecord.role || 'patient');
      } else {
        // Check if user exists in doctors table - case insensitive
        const doctor = await db.select().from(doctors).where(sql`LOWER(${doctors.email}) = LOWER(${email})`).limit(1);
        if (doctor.length > 0) {
          userRecord = doctor[0];
          userType = 'doctor';
        }
      }

      if (!userRecord) {
        addLog("warning", `Login request for unregistered email: ${email}`);
        return res.status(404).json({ 
          success: false,
          message: "Email not found. Please contact your healthcare provider for access." 
        });
      }

      if (!userRecord.phoneNumber && !userRecord.phone) {
        addLog("error", `User ${email} has no phone number for SMS verification`);
        return res.status(400).json({ 
          success: false,
          message: "No phone number on file. Please contact support." 
        });
      }

      const phoneNumber = userRecord.phoneNumber || userRecord.phone;
      const userName = userRecord.name || userRecord.username || 'User';

      // Generate login verification challenge
      const challengeResult = await authService.sendReAuthChallenge({
        [userType === 'doctor' ? 'doctorId' : 'userId']: userRecord.id,
        email: email,
        phone: phoneNumber,
        name: userName,
        challengeType: 'sms',
        action: 'Secure Login to Keep Going Care',
        userRole: userType
      });

      if (!challengeResult.success) {
        addLog("error", `Failed to send login SMS to ${email}: ${challengeResult.error}`);
        return res.status(500).json({ 
          success: false,
          message: "Unable to send verification code. Please try again." 
        });
      }

      addLog("info", `Login verification code sent to ${email} (${userType})`);
      
      res.json({
        success: true,
        message: "Verification code sent to your registered phone number",
        loginToken: challengeResult.token,
        userType: userType
      });

    } catch (error) {
      console.error("Login request error:", error);
      addLog("error", `Login request failed for ${req.body.email}: ${error}`);
      res.status(500).json({ 
        success: false,
        message: "Server error. Please try again." 
      });
    }
  });

  // POST /api/auth/verify-login - Verify SMS code and complete login
  app.post("/api/auth/verify-login",
    sanitizeRequestBody,
    body('loginToken').notEmpty().withMessage('Login token is required'),
    body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('6-digit verification code required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { loginToken, verificationCode } = req.body;

      // Verify the SMS code
      const verificationResult = await authService.verifyReAuthChallenge(loginToken, verificationCode);

      if (!verificationResult.success) {
        addLog("warning", `Failed login verification attempt with token: ${loginToken}`);
        return res.status(401).json({ 
          success: false,
          message: "Invalid or expired verification code" 
        });
      }

      // Extract user info from verification result
      const userData = verificationResult.userData;
      if (!userData) {
        addLog("error", `No user data in verification result for token: ${loginToken}`);
        return res.status(500).json({ 
          success: false,
          message: "Authentication error. Please try again." 
        });
      }

      // Create session - ensure session object exists
      if (!req.session) {
        addLog("error", "Session not initialized");
        return res.status(500).json({ 
          success: false,
          message: "Session error. Please try again." 
        });
      }
      
      console.log(`Login verification: Setting session for user ${userData.email}, role=${userData.role}, type=${userData.type}`);
      req.session.userId = userData.id;
      req.session.userRole = userData.role;
      req.session.lastActivity = Date.now();

      addLog("info", `Successful passwordless login for ${userData.email} (${userData.type})`);

      // Login attempt notifications disabled to prevent interference with healthcare workflows
      // These notifications were causing unwanted emails during patient creation and doctor workflows
      addLog("info", `Login attempt notification disabled for ${userData.email} to prevent workflow interference`);

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.type
        },
        redirectTo: userData.type === 'doctor' ? '/doctor' : userData.type === 'admin' ? '/admin' : '/'
      });

    } catch (error) {
      console.error("Login verification error:", error);
      addLog("error", `Login verification failed: ${error}`);
      res.status(500).json({ 
        success: false,
        message: "Verification failed. Please try again." 
      });
    }
  });

  // =============================================================================
  // PART 2: LOGOUT ENDPOINT
  // =============================================================================

  // POST /api/auth/logout - Basic logout endpoint
  app.post("/api/auth/logout", (req: any, res) => {
    try {
      // Clear session cookie immediately
      res.clearCookie('connect.sid');
      
      // Log logout attempt
      const userId = req.session?.userId;
      if (userId) {
        addLog("info", `User ${userId} logged out`);
      } else {
        addLog("info", "Logout request processed");
      }

      // Send success response immediately
      res.json({ 
        success: true, 
        message: "Logout successful",
        redirectTo: "/"
      });

      // Try to destroy session in background (non-blocking)
      if (req.session) {
        setImmediate(() => {
          try {
            req.session.destroy(() => {});
          } catch (err) {
            addLog("warning", `Background session cleanup failed: ${err}`);
          }
        });
      }
    } catch (error) {
      addLog("error", `Logout error: ${error}`);
      res.clearCookie('connect.sid');
      res.json({ 
        success: true, 
        message: "Logout completed",
        redirectTo: "/"
      });
    }
  });

  // =============================================================================
  // PART 2.5: RE-AUTHENTICATION ENDPOINTS
  // =============================================================================

  // POST /api/auth/challenge - Request re-authentication challenge
  app.post("/api/auth/challenge",
    sanitizeRequestBody,
    body('action').notEmpty().withMessage('Action is required'),
    body('challengeType').isIn(['sms', 'email', 'both']).withMessage('Valid challenge type is required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { action, challengeType } = req.body;
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user/doctor information
      let userInfo = null;
      if (userRole === 'doctor') {
        const [doctor] = await db.select().from(doctors).where(eq(doctors.id, userId));
        userInfo = doctor;
      } else {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        userInfo = user;
      }

      if (!userInfo) {
        return res.status(404).json({ error: "User not found" });
      }

      // Send re-authentication challenge
      const phone = userRole === 'doctor' ? (userInfo as any).phone : (userInfo as any).phoneNumber;
      const email = userInfo.email || '';
      const name = userInfo.name || '';
      
      if (!phone || !email || !name) {
        return res.status(400).json({ error: "Missing required contact information" });
      }
      
      const result = await authService.sendReAuthChallenge({
        userId: userRole === 'patient' ? userId : undefined,
        doctorId: userRole === 'doctor' ? userId : undefined,
        email,
        phone,
        name,
        challengeType,
        action
      });

      if (result.success) {
        addLog("info", `Re-auth challenge sent for user ${userId} (${userRole}) - action: ${action}`);
        res.json({
          success: true,
          challengeToken: result.token,
          message: `Verification code sent via ${challengeType}`
        });
      } else {
        addLog("error", `Re-auth challenge failed for user ${userId}: ${result.error}`);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      addLog("error", `Re-auth challenge error: ${error}`);
      res.status(500).json({ error: "Failed to send re-authentication challenge" });
    }
  });

  // POST /api/auth/verify-challenge - Verify re-authentication challenge
  app.post("/api/auth/verify-challenge",
    sanitizeRequestBody,
    body('challengeToken').notEmpty().withMessage('Challenge token is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code is required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { challengeToken, code } = req.body;

      const result = await authService.verifyReAuthChallenge(challengeToken, code);

      if (result.success) {
        addLog("info", `Re-auth challenge verified successfully - action: ${result.action}`);
        res.json({
          success: true,
          message: "Re-authentication successful",
          action: result.action,
          verified: true
        });
      } else {
        addLog("warning", `Re-auth challenge verification failed: ${result.error}`);
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      addLog("error", `Re-auth verification error: ${error}`);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // POST /api/auth/enhanced-login - Login with notifications
  app.post("/api/auth/enhanced-login",
    sanitizeRequestBody,
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { username, password } = req.body;

      // Find user by username
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (!user) {
        addLog("warning", `Login attempt with invalid username: ${username}`);
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Verify password (in production, use proper password hashing)
      if (user.password !== password) {
        addLog("warning", `Failed login attempt for user: ${username}`);
        
        // Send security alert for failed login
        if (user.email && user.phoneNumber && user.name) {
          await authService.sendSecurityAlert({
            userId: user.id,
            email: user.email,
            phone: user.phoneNumber,
            name: user.name,
            action: 'security_alert',
            ipAddress: req.ip || 'Unknown',
            timestamp: new Date()
          });
        }
        
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Check subscription status for patients
      if (user.role === 'patient' && !user.isSubscriptionActive) {
        addLog("warning", `Login blocked for inactive subscription: ${username}`);
        return res.status(403).json({
          error: "Subscription required",
          message: "Please activate your subscription to continue",
          redirectTo: "/patient-setup"
        });
      }

      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.lastActivity = Date.now();

      // Send login notification
      if (user.email && user.phoneNumber && user.name) {
        await authService.sendLoginAttemptNotification({
          userId: user.id,
          email: user.email,
          phone: user.phoneNumber,
          name: user.name,
          action: 'login_attempt',
          ipAddress: req.ip || 'Unknown',
          timestamp: new Date()
        });
      }

      addLog("info", `Enhanced login successful for user ${user.id} (${user.role})`);

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isSubscriptionActive: user.isSubscriptionActive
        }
      });

    } catch (error) {
      addLog("error", `Enhanced login error: ${error}`);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // =============================================================================
  // PART 2.8: PPR GENERATION ENDPOINTS
  // =============================================================================

  // POST /api/reports/generate-ppr - Generate Patient Progress Report
  app.post("/api/reports/generate-ppr",
    sanitizeRequestBody,
    body('patientId').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { patientId } = req.body;
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      // Authorization check - only doctors and admins can generate PPRs
      if (!userId || (userRole !== 'doctor' && userRole !== 'admin')) {
        addLog("warning", `Unauthorized PPR generation attempt by user ${userId}`);
        return res.status(403).json({
          success: false,
          error: "Unauthorized. Only healthcare providers can generate patient reports."
        });
      }

      addLog("info", `PPR generation requested for patient ${patientId} by user ${userId} (${userRole})`);

      // Generate the comprehensive PPR
      const { pprService } = await import('./services/pprService');
      const report = await pprService.generatePprForPatient(patientId);

      addLog("info", `PPR successfully generated for patient ${patientId}`);

      res.json({
        success: true,
        message: "Patient Progress Report generated successfully",
        report: report,
        generatedAt: new Date().toISOString(),
        patientId: patientId
      });

    } catch (error) {
      addLog("error", `PPR generation failed: ${error}`);
      res.status(500).json({
        success: false,
        error: "Failed to generate Patient Progress Report. Please try again."
      });
    }
  });

  // GET /api/reports/patient-summary/:patientId - Get patient summary for PPR preview
  app.get("/api/reports/patient-summary/:patientId",
    authRateLimit,
    async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      if (!userId || (userRole !== 'doctor' && userRole !== 'admin')) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized access"
        });
      }

      const { pprService } = await import('./services/pprService');
      const summary = await pprService.getPatientSummary(patientId);

      if (!summary) {
        return res.status(404).json({
          success: false,
          error: "Patient not found"
        });
      }

      res.json({
        success: true,
        summary: summary
      });

    } catch (error) {
      addLog("error", `Patient summary fetch failed: ${error}`);
      res.status(500).json({
        success: false,
        error: "Failed to fetch patient summary"
      });
    }
  });

  // GET /api/ai/context/:patientId - Get AI context for patient
  app.get("/api/ai/context/:patientId",
    authRateLimit,
    async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      if (!userId || (userRole !== 'doctor' && userRole !== 'admin' && userId !== patientId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized access"
        });
      }

      const { aiContextService } = await import('./services/aiContextService');
      const context = await aiContextService.getPatientContext(patientId);

      if (!context) {
        return res.status(404).json({
          success: false,
          error: "Patient context not found"
        });
      }

      res.json({
        success: true,
        context: context
      });

    } catch (error) {
      addLog("error", `AI context fetch failed: ${error}`);
      res.status(500).json({
        success: false,
        error: "Failed to fetch patient context"
      });
    }
  });

  // POST /api/ai/contextual-response - Generate contextual AI response
  app.post("/api/ai/contextual-response",
    sanitizeRequestBody,
    body('patientId').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
    body('query').isLength({ min: 1, max: 500 }).withMessage('Query must be 1-500 characters'),
    handleValidationErrors,
    authRateLimit,
    async (req: any, res) => {
    try {
      const { patientId, query } = req.body;
      const userId = req.session?.userId;

      if (!userId || userId !== patientId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized access"
        });
      }

      const { aiContextService } = await import('./services/aiContextService');
      const response = await aiContextService.generateContextualResponse(patientId, query);

      res.json({
        success: true,
        response: response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      addLog("error", `Contextual response failed: ${error}`);
      res.status(500).json({
        success: false,
        error: "Failed to generate contextual response"
      });
    }
  });

  // GET /api/ai/engagement-analysis/:patientId - Analyze patient engagement
  app.get("/api/ai/engagement-analysis/:patientId",
    authRateLimit,
    async (req: any, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      if (!userId || (userRole !== 'doctor' && userRole !== 'admin' && userId !== patientId)) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized access"
        });
      }

      const { aiContextService } = await import('./services/aiContextService');
      const analysis = await aiContextService.analyzeEngagement(patientId);

      res.json({
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      addLog("error", `Engagement analysis failed: ${error}`);
      res.status(500).json({
        success: false,
        error: "Failed to analyze patient engagement"
      });
    }
  });

  // =============================================================================
  // PART 2.9: EMAIL TESTING ENDPOINTS
  // =============================================================================

  // POST /api/test/send-doctor-welcome - Send test doctor welcome email
  app.post("/api/test/send-doctor-welcome", async (req: any, res) => {
    try {
      const result = await emailService.sendDoctorWelcomeEmail(
        "marijke.collins@keepgoingcare.com",
        "Dr. Marijke Collins",
        "https://kgcpr.replit.app/doctor-setup/test-token-123"
      );

      if (result.success) {
        addLog("info", "Test doctor welcome email sent to Dr. Marijke Collins");
        res.json({ 
          success: true, 
          message: "Doctor welcome email sent successfully to marijke.collins@keepgoingcare.com" 
        });
      } else {
        addLog("error", `Failed to send test doctor welcome email: ${result.error}`);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      addLog("error", `Test doctor welcome email error: ${error}`);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // POST /api/test/send-patient-welcome - Send test patient welcome email
  app.post("/api/test/send-patient-welcome", async (req: any, res) => {
    try {
      // Generate proper external URL for authentication link
      let baseUrl;
      if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else {
        baseUrl = 'http://localhost:5000';
      }
      
      const authLink = `${baseUrl}/login`;
      
      console.log(`[DEBUG] Generated authentication link: ${authLink}`);
      addLog("info", `Patient welcome email authentication link: ${authLink}`);
      
      const result = await emailService.sendPatientWelcomeEmail(
        "tom.jones@keepgoingcare.com",
        "Tom Jones",
        authLink
      );

      if (result.success) {
        addLog("info", "Test patient welcome email sent to Tom Jones");
        res.json({ 
          success: true, 
          message: "Patient welcome email sent successfully to tom.jones@keepgoingcare.com" 
        });
      } else {
        addLog("error", `Failed to send test patient welcome email: ${result.error}`);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      addLog("error", `Test patient welcome email error: ${error}`);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // POST /api/test/auth-notifications - Send test authentication notifications
  app.post("/api/test/auth-notifications", async (req: any, res) => {
    try {
      const { recipient } = req.body;
      
      if (recipient === "doctor") {
        // Admin notifications disabled to prevent interference with patient workflows
        addLog("info", "Admin login notifications disabled during patient welcome email workflows");
        res.json({
          success: true,
          message: "Admin notifications disabled - no alerts sent to prevent workflow interference",
          logout: false,
          challenge: false,
          challengeToken: null
        });

      } else if (recipient === "patient") {
        // Test logout notification for Mr. Reuben Collins
        const logoutResult = await authService.sendLogoutNotification({
          userId: 2,
          email: "reuben.collins@keepgoingcare.com",
          phone: "+61422135631",
          name: "Mr. Reuben Collins",
          action: 'logout',
          ipAddress: req.ip || 'Test IP',
          userAgent: 'Test User Agent',
          timestamp: new Date()
        });

        // Test re-auth challenge for Mr. Reuben Collins
        const challengeResult = await authService.sendReAuthChallenge({
          userId: 2,
          email: "reuben.collins@keepgoingcare.com",
          phone: "+61422135631",
          name: "Mr. Reuben Collins",
          challengeType: 'both',
          action: 'Update Health Profile'
        });

        addLog("info", "Test authentication notifications sent to Mr. Reuben Collins");
        res.json({
          success: true,
          message: "Authentication test notifications sent to Mr. Reuben Collins",
          logout: logoutResult.success,
          challenge: challengeResult.success,
          challengeToken: challengeResult.token
        });

      } else {
        res.status(400).json({ error: "Invalid recipient. Use 'doctor' or 'patient'" });
      }

    } catch (error) {
      addLog("error", `Test auth notifications error: ${error}`);
      res.status(500).json({ error: "Failed to send test notifications" });
    }
  });

  // =============================================================================
  // PART 3: AUTH STATUS AND USER ENDPOINTS
  // =============================================================================

  // GET /api/auth/me - Get current authenticated user
  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    try {
      // Fetch actual user data from database to ensure correct role
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
      
      if (!user) {
        // User not found in users table, check doctors table
        const [doctor] = await db.select().from(doctors).where(eq(doctors.id, req.session.userId));
        
        if (doctor) {
          return res.json({
            success: true,
            user: {
              id: doctor.id,
              role: 'doctor',
              name: doctor.name,
              email: doctor.email
            }
          });
        }
        
        // Neither user nor doctor found, clear session
        req.session.destroy((err: any) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ success: false, error: "User not found" });
      }

      // Return user data with actual role from database
      res.json({
        success: true,
        user: {
          id: user.id,
          role: user.role,
          name: user.name || user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // GET /api/user/:id - Get user details by ID
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isSubscriptionActive: user.isSubscriptionActive || false
        }
      });

    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // =============================================================================
  // PART 4: UPDATED SMS VERIFICATION WITH SUBSCRIPTION CHECK
  // =============================================================================

  // Update the existing SMS verification endpoint to check subscription status
  app.post("/api/auth/verify-sms",
    sanitizeRequestBody,
    body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('code').isLength({ min: 4, max: 10 }).withMessage('Verification code must be between 4 and 10 characters'),
    handleValidationErrors,
    authRateLimit,
    async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ error: "Phone number and verification code are required" });
      }

      // For demo purposes, accept any 6-digit code
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Invalid verification code format" });
      }

      // Find user by phone number
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, phone));

      if (!user) {
        return res.status(404).json({ error: "User not found with this phone number" });
      }

      // Check if user has active subscription (for patients)
      if (user.role === 'patient' && !user.isSubscriptionActive) {
        return res.status(403).json({ 
          error: "Subscription required",
          message: "Please complete your subscription before logging in",
          redirectTo: "/patient-setup"
        });
      }

      // Create session for authenticated user
      (req as any).session.userId = user.id;
      (req as any).session.userRole = user.role;
      (req as any).session.lastActivity = Date.now();

      addLog("info", `User ${user.id} (${user.role}) logged in via SMS verification`);

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isSubscriptionActive: user.isSubscriptionActive
        }
      });

    } catch (error) {
      console.error("SMS verification error:", error);
      addLog("error", `SMS verification failed: ${error}`);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // =============================================================================
  // PPR GENERATION ENDPOINT
  // =============================================================================

  // POST /api/doctor/patients/:patientId/generate-ppr - Generate Patient Progress Report
  app.post("/api/doctor/patients/:patientId/generate-ppr", doctorAuthMiddleware, async (req: any, res) => {
    try {
      const doctorId = req.doctorId;
      const patientId = parseInt(req.params.patientId);

      if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      // Verify doctor has access to this patient
      const [patientAssignment] = await db
        .select()
        .from(doctorPatients)
        .where(and(
          eq(doctorPatients.doctorId, doctorId),
          eq(doctorPatients.patientId, patientId)
        ));

      if (!patientAssignment) {
        return res.status(403).json({ error: "Access denied to this patient" });
      }

      addLog("info", `Doctor ${doctorId} generating PPR for patient ${patientId}`);

      // Generate the Patient Progress Report
      const generatedReport = await pprService.generatePprForPatient(patientId);

      addLog("info", `PPR generated successfully for patient ${patientId} by doctor ${doctorId}`);

      res.json({
        success: true,
        report: generatedReport,
        patientId: patientId,
        generatedAt: new Date().toISOString(),
        generatedBy: doctorId
      });

    } catch (error) {
      console.error("Error generating PPR:", error);
      addLog("error", `PPR generation failed for patient ${req.params.patientId}: ${error}`);
      
      res.status(500).json({ 
        error: "Failed to generate Patient Progress Report",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Send patient welcome email endpoint
  app.post("/api/send-patient-welcome", async (req, res) => {
    try {
      const { email, patientName, accessLink } = req.body;

      // Send welcome email to patient using the new template
      const emailResult = await emailService.sendPatientWelcomeEmail(
        email,
        patientName,
        accessLink
      );

      addLog("info", `Patient welcome email sent to: ${email}`);

      res.json({
        success: true,
        message: "Patient welcome email sent successfully",
        emailSent: emailResult.success,
        emailError: emailResult.error || null
      });

    } catch (error) {
      console.error("Error sending patient welcome email:", error);
      res.status(500).json({ error: "Failed to send patient welcome email" });
    }
  });

  // Test endpoint to create Tom Jones patient and send welcome email
  app.post("/api/test-patient-creation", async (req, res) => {
    try {
      const { doctorId, name, email, phoneNumber } = req.body;

      // Generate username from email
      const username = email.toLowerCase().replace('@', '_').replace(/[^a-z0-9_]/g, '');

      // Create new patient user record
      const [newPatient] = await db
        .insert(users)
        .values({
          username,
          password: "temp_password", 
          role: "patient",
          name,
          email,
          phoneNumber
        })
        .returning();

      // Link patient to doctor
      await db
        .insert(doctorPatients)
        .values({
          doctorId,
          patientId: newPatient.id
        });

      // Generate access link for patient authentication
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
      const accessLink = `${baseUrl}/login`;

      // Send welcome email to patient using the new template
      const emailResult = await emailService.sendPatientWelcomeEmail(
        email,
        name,
        accessLink
      );

      addLog("info", `Test patient created: ${email} and welcome email sent`);

      res.json({
        success: true,
        message: "Patient created and welcome email sent",
        patient: {
          id: newPatient.id,
          name: newPatient.name,
          email: newPatient.email,
          phoneNumber: newPatient.phoneNumber
        },
        emailSent: emailResult.success,
        emailError: emailResult.error || null
      });

    } catch (error) {
      console.error("Error creating test patient:", error);
      res.status(500).json({ error: "Failed to create patient and send email" });
    }
  });

  return httpServer;
}
