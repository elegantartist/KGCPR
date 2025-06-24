import express, { Request, Response, RequestHandler } from 'express';
import path from 'path';
import session from 'express-session';
import { db } from './db.js';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

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

// Twilio SMS Service
const sendSMS = async (to: string, message: string): Promise<boolean> => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log('Twilio not configured, logging code instead');
      return false;
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: message,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
};

// Request login code
const requestLogin: RequestHandler = async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    // Check if user exists
    const userResult = await db.select().from(users).where(eq(users.email, email));
    
    if (userResult.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult[0];
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try to send SMS if phone number exists
    let smsSent = false;
    if (user.phoneNumber) {
      const message = `Your Keep Going Care verification code is: ${code}`;
      smsSent = await sendSMS(user.phoneNumber, message);
    }
    
    console.log(`Login code for ${email}: ${code} ${smsSent ? '(sent via SMS)' : '(SMS failed/not configured)'}`);
    
    // Store code temporarily
    req.session.loginCode = code;
    req.session.loginEmail = email;

    res.json({ 
      success: true,
      message: smsSent ? 'Verification code sent via SMS' : 'Verification code generated',
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });
  } catch (error) {
    console.error('Request login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


app.post('/api/auth/request-login', requestLogin);

// Verify login code
const verifyLogin: RequestHandler = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    res.status(400).json({ error: 'Email and code are required' });
    return;
  }

  if (req.session.loginCode !== code || req.session.loginEmail !== email) {
    res.status(400).json({ error: 'Invalid verification code' });
    return;
  }

  // Clear the temporary login data
  delete req.session.loginCode;
  delete req.session.loginEmail;

  try {
    // Find user in database
    const userResult = await db.select().from(users).where(eq(users.email, email));
    
    if (userResult.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult[0];
    
    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/api/auth/verify-login', verifyLogin);

// Logout
const logout: RequestHandler = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
};

app.post('/api/auth/logout', logout);

// Check session endpoint
const checkSession: RequestHandler = async (req: Request, res: Response) => {
  if (req.session.userId) {
    try {
      // Get user from database
      const userResult = await db.select().from(users).where(eq(users.id, req.session.userId));
      
      if (userResult.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = userResult[0];
      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Check session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(401).json({ error: 'No active session' });
  }
};

app.get('/api/auth/session', checkSession);

// Admin stats endpoint
const getAdminStats: RequestHandler = async (req: Request, res: Response) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  try {
    const totalUsers = await db.select().from(users);
    const adminUsers = totalUsers.filter(u => u.role === 'admin');
    const doctorUsers = totalUsers.filter(u => u.role === 'doctor');
    const patientUsers = totalUsers.filter(u => u.role === 'patient');

    const stats = {
      totalUsers: totalUsers.length,
      totalAdmins: adminUsers.length,
      totalDoctors: doctorUsers.length,
      totalPatients: patientUsers.length,
      systemStatus: 'operational'
    };

    res.json({ stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

app.get('/api/admin/stats', getAdminStats);

const healthCheck: RequestHandler = (req: Request, res: Response) => {
  res.status(200).send({ status: 'Keep Going Care server running with authentication' });
};

app.get('/api/health', healthCheck);

// Static file serving
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// Client-side routing fallback
const serveApp: RequestHandler = (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
};

app.get('*', serveApp);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KGCPR Integrated Server is now listening on port ${PORT}`);
});