# NodeHost Pro

## Overview

NodeHost Pro is a full-stack web application that provides a cloud-based Node.js hosting platform. Users can create, manage, and deploy Node.js applications through a modern web interface. The platform features real-time terminal output, file management, and process control for hosted applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript built using Vite
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark theme
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket connection for live terminal output

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Session Management**: Express session middleware with in-memory storage
- **File Operations**: Multer for file uploads, AdmZip for archive extraction
- **Process Management**: Child process spawning for Node.js application execution
- **WebSocket Server**: ws library for real-time terminal logging

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: User accounts and server management tables
- **File Storage**: Local filesystem for uploaded application files
- **Session Storage**: In-memory session store (development configuration)

### Authentication and Authorization
- **Authentication**: Simple username/password authentication with hardcoded credentials (JOHN/REESE)
- **Session Management**: Express sessions with secure cookie configuration
- **Authorization**: Session-based access control for API endpoints

### External Dependencies
- **Database Provider**: Neon Database (PostgreSQL-compatible serverless database)
- **Development Tools**: 
  - Replit-specific Vite plugins for development experience
  - Drizzle Kit for database migrations and schema management
- **UI Framework**: Comprehensive Radix UI component ecosystem
- **Build Tools**: ESBuild for server bundling, Vite for client bundling

### Key Features
- **Multi-tenant Server Management**: Users can create up to 3 Node.js servers
- **Real-time Process Monitoring**: Live terminal output via WebSocket connections
- **File Management**: ZIP file upload and extraction for application deployment
- **Automatic Dependency Installation**: NPM package installation on server start
- **Process Lifecycle Management**: Start, stop, and monitor Node.js applications