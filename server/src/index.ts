import express from 'express';
import path from 'path';
import session from 'express-session';

import type { Request, Response } from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string;
    loginCode?: string;
    loginEmail?: string;
  }
}

// Session configuration
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'keepgoingcare-dev-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
  },
};

app.use(session(sessionConfig));
app.use(express.json());

// Request login code
app.post('/api/auth/request-login', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // In development, return the code directly
  console.log(`Login code for ${email}: ${code}`);
  
  // Store code temporarily
  req.session.loginCode = code;
  req.session.loginEmail = email;
  
  res.json({ 
    message: 'Verification code sent',
    code: process.env.NODE_ENV === 'development' ? code : undefined
  });
});

// Verify login code
app.post('/api/auth/verify-login', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  if (req.session.loginCode !== code || req.session.loginEmail !== email) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  // Clear the temporary login data
  delete req.session.loginCode;
  delete req.session.loginEmail;

  // Handle the admin user specifically
  let user;
  if (email === 'admin@keepgoingcare.com') {
    req.session.userId = 1;
    req.session.role = 'admin';
    user = {
      id: 1,
      email: email,
      role: 'admin' as const
    };
  } else {
    // For other users, default to patient role
    req.session.userId = 2;
    req.session.role = 'patient';
    user = {
      id: 2,
      email: email,
      role: 'patient' as const
    };
  }

  res.json({ user });
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check session endpoint
app.get('/api/auth/session', (req: Request, res: Response) => {
  if (req.session.userId) {
    let email = 'user@example.com';
    if (req.session.userId === 1) {
      email = 'admin@keepgoingcare.com';
    }
    
    const user = {
      id: req.session.userId,
      email: email,
      role: req.session.role || 'patient'
    };
    res.json({ user });
  } else {
    res.status(401).json({ error: 'No active session' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'Keep Going Care server running with authentication' });
});

// Static file serving
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// Client-side routing fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KGCPR Integrated Server is now listening on port ${PORT}`);
});