import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import rateLimit from 'express-rate-limit';
import DOMPurify from 'isomorphic-dompurify';

// Input Sanitization Middleware
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Sanitize string inputs to prevent XSS
        req.body[key] = DOMPurify.sanitize(req.body[key].trim());
      }
    }
  }
  next();
};

// Validation Error Handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Score Submission Validation
export const validateScoreSubmission: ValidationChain[] = [
  body('dietScore')
    .isInt({ min: 1, max: 10 })
    .withMessage('Diet score must be an integer between 1 and 10'),
  body('exerciseScore')
    .isInt({ min: 1, max: 10 })
    .withMessage('Exercise score must be an integer between 1 and 10'),
  body('medicationScore')
    .isInt({ min: 1, max: 10 })
    .withMessage('Medication score must be an integer between 1 and 10')
];

// User Registration Validation
export const validateUserRegistration: ValidationChain[] = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// User Login Validation
export const validateUserLogin: ValidationChain[] = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 50 })
    .withMessage('Username too long'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 100 })
    .withMessage('Password too long')
];

// Doctor Creation Validation
export const validateDoctorCreation: ValidationChain[] = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Doctor name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.-]+$/)
    .withMessage('Doctor name can only contain letters, spaces, dots, and hyphens'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('phone')
    .isMobilePhone('any')
    .withMessage('Must be a valid phone number')
];

// Care Plan Directive Validation
export const validateCarePlanDirective: ValidationChain[] = [
  body('title')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent')
];

// Chat Query Validation
export const validateChatQuery: ValidationChain[] = [
  body('query')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Query must be between 1 and 1000 characters')
    .trim()
];

// Rate Limiting Configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for sensitive operations
  message: {
    success: false,
    error: 'Too many requests for this sensitive operation, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API Rate Limiter (alias for general rate limit)
export const apiRateLimiter = generalRateLimit;