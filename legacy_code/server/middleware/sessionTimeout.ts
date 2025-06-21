import { Request, Response, NextFunction } from 'express';

// Extend the session interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
    lastActivity?: number;
  }
}

// Session timeout middleware - logs out users after 5 minutes of inactivity
export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip timeout check for auth endpoints and public routes
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/webhooks/') || !req.session?.userId) {
    return next();
  }

  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Check if session has lastActivity timestamp
  if (req.session.lastActivity) {
    const timeSinceLastActivity = now - req.session.lastActivity;
    
    // If more than 5 minutes have passed, destroy the session
    if (timeSinceLastActivity > fiveMinutes) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired due to inactivity',
        redirectTo: '/login'
      });
    }
  }

  // Update lastActivity timestamp for authenticated requests
  req.session.lastActivity = now;
  next();
}