# KGCPR Health Assistant Platform

## Overview

KGCPR is a production-ready health assistant platform designed as a Class I Software as Medical Device (SaMD). The application provides comprehensive health tracking capabilities with AI-powered analysis, supporting both patients and healthcare providers. Built with modern web technologies, it features a React frontend with Express.js backend, utilizing PostgreSQL for secure data persistence and integration with multiple AI services for intelligent health insights.

## System Architecture

### Frontend Architecture
- **Framework**: React 19.1.0 with TypeScript for type-safe development
- **Build Tool**: Vite 6.3.5 providing fast development server and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- **State Management**: React hooks with TanStack Query for efficient server state management and caching
- **Routing**: Wouter for lightweight client-side navigation
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Testing**: Vitest with React Testing Library for comprehensive frontend testing

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database**: PostgreSQL 16 with Drizzle ORM providing type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store for secure authentication
- **Security**: Helmet for security headers, rate limiting, input sanitization, and validation middleware
- **API Design**: RESTful endpoints with comprehensive error handling and validation

### Database Design
The system uses a well-structured PostgreSQL schema with the following key tables:
- **Users**: Core user authentication and profile data with subscription management
- **Patient Scores**: Daily health metrics tracking (diet, exercise, medication adherence)
- **Patient Badges**: Achievement system with Bronze/Silver/Gold/Platinum tiers
- **Motivational Images**: User photo uploads with MIP (Motivational Image Processing)
- **Doctors**: Healthcare provider profiles and credentials
- **Care Plan Directives**: Doctor-prescribed patient guidance
- **Doctor Patients**: Relationship mapping between doctors and patients

## Key Components

### Authentication & Authorization System
- Multi-role support (patient, doctor, admin)
- Session-based authentication with automatic timeout (5 minutes inactivity)
- SMS verification for doctor accounts via Twilio integration
- Role-based access control protecting sensitive endpoints
- Security notifications via email and SMS for account activities

### Daily Self-Scores Feature
- Interactive color-coded sliders for three health metrics (diet, exercise, medication)
- Score validation (1-10 range) with once-per-day submission enforcement
- AI-powered health analysis providing personalized insights
- Proactive trend detection triggering targeted health suggestions
- Badge system rewarding consistent healthy behaviors

### AI-Powered Health Intelligence
- **Supervisor Agent**: OpenAI GPT-4o and Anthropic Claude integration for health analysis
- **Context-Aware Processing**: Real-time patient data aggregation for personalized responses
- **Trend Analysis Service**: Automated detection of positive/negative health patterns
- **Proactive Suggestions**: WebSocket-based real-time notifications for health interventions
- **PHI De-identification**: Privacy-compliant AI processing with data tokenization

### Doctor Dashboard & Patient Management
- Comprehensive patient progress monitoring
- Care Plan Directive (CPD) creation and management
- Patient Progress Report (PPR) generation with AI analysis
- SMS verification workflow for secure doctor onboarding
- Patient relationship management with data segregation

### Communication Services
- **Email Service**: SendGrid integration for transactional emails and notifications
- **SMS Service**: Twilio integration for verification codes and security alerts
- **Template System**: Structured email templates for various communication scenarios

## Data Flow

### Patient Journey
1. **Registration & Onboarding**: User creates account with email verification
2. **Daily Score Submission**: Patient submits health metrics via interactive UI
3. **AI Analysis**: Supervisor Agent processes scores with contextual patient data
4. **Trend Detection**: System analyzes patterns and triggers proactive suggestions
5. **Badge Awards**: Achievement system recognizes consistent healthy behaviors
6. **Progress Reporting**: Data aggregated for doctor review and patient motivation

### Doctor Workflow
1. **Doctor Creation**: Admin creates doctor account with SMS verification
2. **Patient Assignment**: Doctors can create and manage patient relationships
3. **Care Plan Management**: Create and update Care Plan Directives for patients
4. **Progress Monitoring**: Access Patient Progress Reports with AI insights
5. **Clinical Oversight**: Review patient engagement and escalation alerts

### AI Processing Pipeline
1. **Data Aggregation**: AI Context Service gathers patient data
2. **PHI De-identification**: Sensitive data tokenized before AI processing
3. **Multi-Model Analysis**: OpenAI and Anthropic models provide health insights
4. **Response Validation**: Multi-model verification ensures response quality
5. **Context-Aware Delivery**: Personalized responses based on patient history

## External Dependencies

### AI Services
- **OpenAI GPT-4o**: Primary health analysis and chatbot functionality
- **Anthropic Claude**: Secondary validation and specialized health insights

### Communication Providers
- **SendGrid**: Email delivery for notifications, welcome messages, and security alerts
- **Twilio**: SMS verification codes and security notifications

### Payment Processing
- **Stripe**: Subscription management with webhook support for payment events

### Database & Infrastructure
- **PostgreSQL**: Primary database with session storage
- **Neon Database**: Serverless PostgreSQL hosting (based on @neondatabase/serverless dependency)

## Deployment Strategy

### Environment Configuration
- Comprehensive `.env.example` with all required service configurations
- Database connection settings for PostgreSQL
- API keys for AI services (OpenAI, Anthropic)
- Communication service credentials (SendGrid, Twilio)
- Stripe payment processing keys
- Session security configuration

### Build Process
- **Frontend**: Vite build process generating optimized static assets
- **Backend**: ESBuild compilation for Node.js production deployment
- **Database**: Drizzle Kit for schema management and migrations

### Replit Deployment
- Configured for autoscale deployment target
- Multi-port configuration (3000, 3001, 5000, 8080)
- Automated build and start scripts
- Development and production environment support

### Security Features
- Helmet security headers with CSP, HSTS, and frame protection
- Rate limiting: General (100 req/15min), Auth (5 req/15min), Strict (10 req/hr)
- Input sanitization with DOMPurify and express-validator
- Session timeout and security notifications
- PHI de-identification for AI processing compliance

## Changelog

```
Changelog:
- June 21, 2025. Initial setup
- June 21, 2025. Executed scorched earth reset (ADR-026) 
- June 21, 2025. Implemented integrated server architecture (Phase 30-32)
- June 21, 2025. Established clean database foundation with Drizzle ORM
- June 21, 2025. Enforced architectural purity - eliminated deviant scripts
- June 24, 2025. Implemented sophisticated AI system with Model Context Protocol (MCP)
- June 24, 2025. Added Supervisor Agent with OpenAI GPT-4o and Anthropic Claude integration
- June 24, 2025. Created comprehensive patient dashboard with AI health assistant
- June 24, 2025. Established AI Context Service for personalized health insights
- June 24, 2025. Added Twilio SMS integration for verification codes
- June 24, 2025. Deployed complete MCP framework matching attached specification
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```