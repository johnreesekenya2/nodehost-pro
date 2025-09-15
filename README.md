
# NodeHost Pro

A modern, full-stack Node.js bot hosting platform built with React and Express.

## Features

- **User Authentication** - Secure login system
- **Server Management** - Create, start, stop, and delete Node.js servers
- **File Management** - Upload ZIP files and manage server files
- **Real-time Console** - Live terminal output via WebSockets
- **Modern UI** - Built with React, TypeScript, and Tailwind CSS

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui components
- TanStack Query for state management
- Wouter for routing

### Backend
- Node.js with Express
- TypeScript
- SQLite database with Drizzle ORM
- WebSocket server for real-time communication
- Session-based authentication

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/johnreesekenya2/nodehost-pro.git
cd nodehost-pro
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5000`

### Default Login Credentials
- Username: `JOHN`
- Password: `REESE`

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry point
├── shared/                # Shared TypeScript schemas
└── uploads/              # File upload directory
```

## Features Overview

### Server Management
- Create up to 3 Node.js servers per user
- Upload ZIP files containing bot code
- Start/stop/restart servers with real-time status updates

### File Management
- Browse server files
- Upload and extract ZIP archives
- Move files to root directory
- Delete unwanted files

### Real-time Console
- Live terminal output via WebSocket connection
- Real-time logging of server processes
- Process management controls

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Server Management
- `GET /api/servers` - List user servers
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server details
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

### Process Control
- `POST /api/servers/:id/start` - Start server process
- `POST /api/servers/:id/stop` - Stop server process
- `POST /api/servers/:id/restart` - Restart server process

### File Operations
- `POST /api/servers/:id/upload` - Upload ZIP file
- `GET /api/servers/:id/files` - List server files
- `POST /api/servers/:id/move-to-root` - Move files to root
- `DELETE /api/servers/:id/files` - Delete file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

---

**Powered by 👑 John Reese**
