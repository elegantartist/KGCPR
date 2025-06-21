# KGCPR - Health Assistant Application

## Overview

KGCPR is a full-stack web application designed as a production-ready health assistant. The application features a React frontend with Express.js backend, utilizing PostgreSQL for data persistence and Drizzle ORM for database operations. The system implements user authentication, patient score tracking, and health analytics functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 6.3.5 for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI components
- **State Management**: React hooks with TanStack Query for server state management
- **Routing**: Wouter for client-side navigation
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL 16 with Drizzle ORM for type-safe database operations
- **AI Services**: OpenAI GPT-4o and Anthropic Claude integration via Supervisor Agent with context awareness
- **Context Pipeline**: AI Context Service providing real-time patient data aggregation
- **Communication Services**: SendGrid email and Twilio SMS integration for notifications and verification
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful endpoints with comprehensive error handling

### Database Design
- **Users Table**: Stores user authentication data (id, username, password)
- **Patient Scores Table**: Tracks daily health scores (diet, exercise, medication adherence)
- **Patient Badges Table**: Achievement tracking with Bronze/Silver/Gold/Platinum tiers
- **Motivational Images Table**: User photo uploads with MIP star enhancement processing
- **Schema Location**: `shared/schema.ts` with Zod validation schemas

## Key Components

### Authentication System
- User registration and login functionality
- Session-based authentication with PostgreSQL session storage
- Password security with proper hashing (implementation pending)

### Daily Self-Scores Feature
- Interactive UI with color-coded sliders for three health metrics:
  - Diet adherence (green theme)
  - Exercise compliance (blue theme)  
  - Medication adherence (red theme)
- Score validation (1-10 range)
- Once-per-day submission enforcement
- AI-powered health analysis based on submitted scores

### UI Component System
- shadcn/ui integration with Radix UI primitives
- Responsive design with mobile-first approach
- Consistent color theming and component variants
- Toast notifications for user feedback

## Data Flow

1. **User Interaction**: Users interact with React components (sliders, forms, buttons)
2. **Client-side Validation**: Zod schemas validate data before submission
3. **API Communication**: TanStack Query manages HTTP requests to Express endpoints
4. **Server Processing**: Express routes handle business logic and database operations
5. **Database Operations**: Drizzle ORM executes type-safe SQL queries
6. **Response Handling**: Success/error responses trigger UI updates and notifications

## External Dependencies

### Database Provider
- **Neon Database**: PostgreSQL hosting via `@neondatabase/serverless`
- Connection string managed via `DATABASE_URL` environment variable

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants

### Development Tools
- **ESBuild**: Fast TypeScript compilation for production
- **TSX**: TypeScript execution for development
- **Drizzle Kit**: Database migration and schema management

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild compiles TypeScript server code to `dist/index.js`
- **Database**: Drizzle migrations apply schema changes

### Production Configuration
- **Port**: Application runs on port 5000 (configurable)
- **Environment**: Production mode disables development features
- **Static Files**: Express serves built React app from `dist/public`

### Replit Integration
- **Autoscale Deployment**: Configured for automatic scaling
- **PostgreSQL Module**: Database provisioning handled by Replit
- **Hot Reload**: Development mode supports live code updates

## Changelog

```
Changelog:
- June 13, 2025. Initial setup
- June 14, 2025. Daily Self-Scores Feature completed with PostgreSQL persistence
- June 14, 2025. Database persistence verified - scores survive server restarts
- June 14, 2025. Motivation feature with MIP photo upload and star enhancement
- June 14, 2025. Progress Milestones with Bronze/Silver/Gold/Platinum badge system
- June 14, 2025. Core AI Services implemented - Supervisor Agent with OpenAI/Anthropic integration
- June 14, 2025. AI Context Service implemented with real-time patient data awareness verification
- June 15, 2025. Communication Services implemented - SendGrid email and Twilio SMS integration with API endpoints
- June 15, 2025. Admin Dashboard and Doctor Creation workflow with HTML email templates and secure API endpoints
- June 15, 2025. Doctor Onboarding Workflow implemented with SMS verification and token-based setup
- June 15, 2025. Doctor Dashboard completed with patient management and Care Plan Directives functionality
- June 15, 2025. Patient Subscription & Session Management implemented with Stripe payments, logout functionality, and 5-minute session timeouts
- June 15, 2025. Proactive Agent Intelligence implemented with trend analysis, AI-powered suggestions, WebSocket notifications, and frontend toast system
- June 15, 2025. Harmonized Feedback Systems implemented to prevent conflicting AI feedback - proactive toast notifications take priority over general analysis dialog
- June 15, 2025. Core Testing Suite implemented with Vitest framework - backend unit tests for badge logic and frontend integration tests for score submission workflow
- June 15, 2025. Connectivity & Offline Resilience implemented with multi-layered offline awareness, automatic data queueing, content caching, and emergency safety protocols
- June 15, 2025. Security Hardening implemented with comprehensive middleware protection - input sanitization with DOMPurify, express-validator validation chains, multi-tier rate limiting, and Helmet security headers for production-grade API security
- June 15, 2025. Comprehensive Test Suite implemented with backend integration tests for doctor onboarding and proactive agent workflows, frontend E2E tests using Playwright for score submission and CPD management, automated test data management, and multi-browser testing capabilities
- June 15, 2025. Production Deployment Preparation completed with test artifact cleanup, comprehensive .env.example configuration template, optimized production builds (frontend to dist/public/, backend to dist/index.js), and deployment readiness verification
- June 16, 2025. NavigationRibbon component implemented across all pages with consistent navigation system featuring orientation video link (https://youtu.be/ET8aoaQjJn0), centered KGC logo, menu functionality, and logout button (homepage only)
- June 16, 2025. Comprehensive SMS and Email Authentication System implemented with Twilio SMS service extensions, SendGrid email templates (logout_notification, login_attempt, reauth_challenge, security_alert), enhanced logout notifications, re-authentication challenge/verify endpoints, security alert system, ReAuthDialog component, and AuthDemoPage for testing authentication flows
- June 16, 2025. Onboarding email templates updated to exact specifications with KGC logo (https://storage.googleapis.com/kgc-assets/KGCLogo.jpg), doctor orientation video (https://youtu.be/AitZI0VTYj8), patient introduction video (https://youtu.be/ET8aoaQjJn0), and EmailTestPage interface for testing Dr Marijke Collins (marijke.collins@keepgoingcare.com, +61433509441) and Mr Reuben Collins (reuben.collins@keepgoingcare.com, +61422135631) notifications
- June 16, 2025. Passwordless Email-SMS Authentication System implemented as PWA front page with LoginPage component featuring "Welcome to Keep Going Care" branding, email input for registered users, 6-digit SMS verification codes, automatic user type detection (patient/doctor/admin), secure session creation with 5-minute timeout, role-based dashboard routing, and comprehensive logout flow with security notifications
- June 16, 2025. PPR Generation Service implemented with comprehensive Patient Progress Report generation using AI analysis of patient health data, scores, badges, and activity patterns - includes PPRGenerationPage component, secure API endpoints for healthcare providers, AI-powered report formatting, and downloadable markdown reports
- June 16, 2025. Enhanced AI Context Awareness implemented with aiContextService providing real-time patient data aggregation, health trend analysis, engagement scoring, contextual AI responses based on patient history, and proactive intervention suggestions for healthcare providers
- June 16, 2025. Role-based routing system implemented to automatically redirect doctors to Doctor Dashboard on application startup, Settings modal updated with solid white background, and orientation video link removed from settings (kept only in welcome emails)
- June 16, 2025. Final production polish completed - Dr Marijke Collins and Reuben Collins patient relationship established in database, TypeScript errors resolved, doctor ID references updated to match authenticated user (ID: 5), and comprehensive healthcare platform achieved 100% completion status
- June 16, 2025. Separate database structures implemented for doctor-patient data segregation with doctor_patient_sessions, supervisor_agent_logs, and patient_data_access tables for enhanced authentication, complete audit trails, and comprehensive supervisor agent monitoring ensuring healthcare compliance and data isolation
- June 16, 2025. Case-insensitive email authentication system implemented with SQL function matching for reliable user login, Reuben Collins phone number updated to 0433509441 for SMS verification
- June 17, 2025. Dr. Marijke Collins phone number updated to 0433509441 for SMS notifications and authentication
- June 17, 2025. Complete admin workflow verified: Admin creates doctors → Doctors create patients → Doctors save CPDs - all functionality working end-to-end with proper authentication and data persistence
- June 17, 2025. Admin phone number updated to +61433509442 for SMS authentication and notifications, admin dashboard logout functionality enabled
- June 17, 2025. Comprehensive JSON/HTML conflict prevention system implemented with API middleware protection, enhanced error boundaries, admin analytics page with real system data, and authentication flow protection to prevent logout loops and ensure consistent JSON responses across all endpoints
- June 17, 2025. Complete admin management system implemented with doctor and patient deletion, patient reassignment functionality, secure API endpoints with admin authentication, real-time UI updates, and comprehensive healthcare administration capabilities - authentication bug fixed for proper admin role recognition
- June 17, 2025. Admin authentication issue resolved - fixed /api/auth/me endpoint to properly fetch user roles from database instead of defaulting to 'patient', enabling full admin dashboard functionality with doctor creation and management capabilities
- June 17, 2025. Session persistence bug fixed - added userRole property to SessionData interface in sessionTimeout.ts middleware, resolving admin role corruption in PostgreSQL session store and enabling complete admin functionality
- June 17, 2025. SendGrid email service fully operational - resolved sender identity verification issue by configuring welcome@keepgoingcare.com as verified sender address, enabling successful doctor welcome emails and authentication notifications
- June 18, 2025. Doctor welcome email template updated to exact user specifications - comprehensive Class I SaMD medical device content with KGC branding, TGA compliance information, Mini Clinical Audit details, terms and conditions highlighting, working orientation video links, and professional Anthrocyti AI Pty Ltd signature - test email successfully delivered to marijke.collins@keepgoingcare.com
- June 18, 2025. Dr. Marijke Collins setup workflow completed - phone number corrected to +61422135631, SMS verification system operational, doctor setup link functional at http://localhost:5000/doctor-setup/cnxrgclujdjcv7arqg8l7l with working SMS codes for account activation
- June 18, 2025. Comprehensive bug fixes implemented: deprecated substr() method replaced with substring(), WebSocket connection port corrected from hardcoded 8080 to dynamic port detection, memory leak prevention in server logs with consistent trimming, missing DialogDescription import added for accessibility compliance, incorrect API request method calls fixed in DoctorDashboard, TypeScript compilation errors resolved - application now fully stable
- June 18, 2025. Doctor setup authentication flow implemented: DoctorSetupPage now redirects unauthenticated users to login page with setup context, LoginPage handles setup URL parameters and redirects back to setup after successful authentication, complete doctor onboarding workflow from email link → login → SMS verification → setup completion → dashboard access
- June 18, 2025. Doctor welcome email authentication flow corrected: Fixed URL generation to use localhost:5000 instead of workspace.admin1023.repl.co, disabled admin login notifications during doctor creation to prevent email interference, implemented proper redirect flow from dashboard link → login → SMS verification → dashboard access
- June 18, 2025. External email link functionality implemented: Dashboard URLs now use proper Replit domain (https://9d0bb7e7-a6ba-4d15-a1ff-ef7e56bd7d30-00-ywaivuo8efou.kirk.replit.dev/doctor) enabling doctor welcome emails to work from external email clients, complete authentication flow from email → login → SMS verification → dashboard access
- June 19, 2025. Admin phone number updated from +61433509441 to +61433509442 to free up original number for Tom Jones patient creation - Dr. Marijke Collins can now create patients using +61433509441 for SMS verification
- June 20, 2025. Critical data privacy fix implemented - Tom Jones email corrected to tom.jones@keepgoingcare.com, patient welcome email template created with exact KGC branding matching user specifications, and admin alert notifications disabled during patient welcome email workflows to prevent unwanted interference
- June 20, 2025. Patient authentication link fix implemented - Applied same external URL generation logic from doctor onboarding to patient welcome emails, replacing localhost URLs with proper Replit domain (https://9d0bb7e7-a6ba-4d15-a1ff-ef7e56bd7d30-00-ywaivuo8efou.kirk.replit.dev/login) enabling external email client access
- June 20, 2025. KGC logo integration completed - Patient welcome email now uses authentic KGC logo from attached assets (KGCLogo_1749876495948.jpg) embedded as base64 data URL, ensuring reliable display across all email clients with exact branding specifications
- June 20, 2025. Critical data segregation violation fixed - Authentication service logic corrected to properly route patients to patient dashboard (/) instead of doctor dashboard (/doctor), preventing PHI data leakage and ensuring strict role-based access control compliance
- June 20, 2025. Login attempt notifications permanently disabled during healthcare workflows to prevent unwanted email interference with patient creation and doctor management processes
- June 20, 2025. Patient dashboard data privacy violation fixed - Removed hardcoded "Reuben Collins" name from HomePage component and implemented proper authenticated user data fetching to ensure each patient sees only their own name and information
- June 20, 2025. Comprehensive user isolation middleware implemented - Created multi-layered data segregation system with userIsolationMiddleware, doctorPatientIsolationMiddleware, patientDataIsolationMiddleware, and auditDataAccessMiddleware to ensure each user can only access their authorized dashboards and data
- June 20, 2025. PPR data isolation security hardened - Added mandatory doctor-patient relationship verification to all Patient Progress Report endpoints, ensuring each PPR contains exclusively the authorized patient's data with zero cross-contamination between patients
- June 20, 2025. Tom Jones deleted successfully to enable fresh patient creation workflow
- June 20, 2025. CPD prerequisite workflow implemented - Doctors must now create Care Plan Directives before patient creation, with comprehensive CPD integration service connecting patient dashboards and Supervisor Agent for personalized health guidance
- June 20, 2025. CarePlanSection component added to patient homepage displaying personalized care plan directives with diet, exercise, and medication focus areas from doctor-prescribed CPDs
- June 20, 2025. Supervisor Agent enhanced with CPD integration - All AI health interactions now use patient's specific Care Plan Directives for personalized, doctor-aligned guidance and recommendations
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```