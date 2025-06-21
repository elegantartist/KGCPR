import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sessionTimeoutMiddleware } from "./middleware/sessionTimeout";
import { pool } from "./db";

const app = express();

// Trust proxy for proper rate limiting with X-Forwarded-For headers
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: unsafe-eval needed for Vite dev
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Disable COEP for compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configure PostgreSQL session store
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'kgc-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax', // Allow cross-site requests for better browser compatibility
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Apply session timeout middleware
app.use(sessionTimeoutMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// API-specific middleware to ensure JSON responses
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  // Set JSON content type for all API responses
  res.setHeader('Content-Type', 'application/json');
  
  // Override res.redirect to prevent HTML redirects on API routes
  const originalRedirect = res.redirect;
  res.redirect = function(this: Response, ...args: any[]) {
    // Instead of redirecting, return JSON error for API routes
    return this.status(401).json({
      success: false,
      error: "Authentication required",
      redirectTo: args[args.length - 1] // Include redirect URL in JSON
    });
  };
  
  next();
});

// Apply session timeout middleware to all API routes
app.use('/api', sessionTimeoutMiddleware);

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handler for consistent JSON responses
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Don't handle error if response already sent
    if (res.headersSent) {
      return _next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Always return JSON for API routes
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(status).json({ 
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      });
    }

    // For non-API routes, use default error handling
    res.status(status).json({ error: message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
