# Canvas Notes

A modern note-taking application with an infinite canvas and AI assistance capabilities. This application allows users to create, organize, and connect notes visually while leveraging AI to enhance their note-taking experience.

## Features

- Infinite canvas for unrestricted note organization
- AI-powered assistance for note creation and organization
- Real-time connections between related notes
- Keyboard shortcuts for efficient navigation
- Minimap for easy navigation of large note collections
- Virtual rendering for optimal performance
- Multi-select and drag capabilities
- Error boundary protection
- Responsive design

## Project Structure

The project is organized into three main directories:

- `frontend/`: React-based user interface
- `backend/`: Node.js server implementation
- `shared/`: Common types and utilities shared between frontend and backend

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd canvas_notes
```

1. Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

## Configuration

1. Create `.env` files in both frontend and backend directories using the provided `.env.example` templates
2. Configure the environment variables according to your setup

## Running the Application

### Development Mode

1. Start the backend server:

```bash
cd backend
npm run dev
```

1. Start the frontend development server:

```bash
cd frontend
npm run dev
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

## License

[Add your chosen license here]

## Contributing

[Add contribution guidelines here]