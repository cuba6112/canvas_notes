# Canvas Notes

A modern interactive sticky notes application with an infinite canvas and AI assistance capabilities. This application allows users to create, organize, and connect notes visually while leveraging AI to enhance their note-taking experience.

## Features

- Infinite canvas for unrestricted note organization
- AI-powered assistance for note creation and organization (Ollama integration)
- Real-time connections between related notes
- Keyboard shortcuts for efficient navigation
- Interactive minimap for easy navigation of large note collections
- Virtual rendering for optimal performance
- Multi-select and bulk note movement
- Physics-based momentum drag system
- Error boundary protection
- Responsive design
- Smart file locking with retry mechanism
- Development-optimized rate limiting

## Project Structure

The project is organized into main directories:

- `frontend/`: React + Vite + Konva.js canvas-based user interface
- `backend/`: Express.js server with Ollama AI integration
- Storage: JSON file with atomic operations

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:

```bash
git clone https://github.com/cuba6112/canvas_notes.git
cd canvas_notes
```

2. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

## Configuration

1. Backend runs on port 5001 by default
2. Frontend runs on port 5174 (Vite default)
3. For development mode, use `NODE_ENV=development` for enhanced features:
   - Enhanced drag system with physics
   - Development-optimized rate limiting (1000 requests/minute)
   - Faster file lock timeouts (2s vs 10s production)

## Running the Application

### Development Mode

1. Start the backend server (from `/backend` directory):

```bash
cd backend
NODE_ENV=development node server.js
# Server runs on port 5001
```

2. Start the frontend development server (from `/frontend` directory):

```bash
cd frontend
npm run dev
# Server runs on port 5174
```

### Production Mode

Use the provided batch scripts:

- `start-app.bat`: Starts both frontend and backend servers
- `stop-app.bat`: Stops all running servers

## Testing

The project includes comprehensive test suites for both frontend and backend:

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## Tech Stack

- **Frontend**: React + Vite + Konva.js (canvas rendering)
- **Backend**: Express.js + Ollama AI integration
- **Storage**: JSON file storage with atomic operations and file locking
- **Development Tools**: Enhanced physics system, smart rate limiting

## Recent Enhancements

- Physics-based momentum drag system
- Multi-select bulk note movement
- Interactive minimap navigation
- Comprehensive keyboard shortcuts
- Development-optimized rate limiting (1000 req/min)
- Smart file locking with retry mechanism

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.