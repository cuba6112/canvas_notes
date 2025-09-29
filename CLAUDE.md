# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Canvas Notes - Interactive sticky notes app with AI integration

## Quick Start

```bash
# Backend (from /backend directory)
NODE_ENV=development node server.js  # Port 5001

# Frontend (from /frontend directory)
npm run dev  # Port 5174
```

## Development Commands

### Backend Commands (from /backend)
- `node server.js` - Start backend server (production mode)
- `NODE_ENV=development node server.js` - Development mode with enhanced features
- `npm test` - Run all tests with Jest
- `npm run test:security` - Run security-specific tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

### Frontend Commands (from /frontend)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run Vitest tests
- `npm run lint` - Lint code with ESLint

## Tech Stack

- **Frontend**: React 18 + Vite + Konva.js (canvas rendering) + react-konva
- **Backend**: Express.js + Ollama AI integration + helmet + cors
- **Storage**: JSON file storage with atomic operations and backup recovery
- **Testing**: Jest (backend) + Vitest + React Testing Library (frontend)

## Architecture Overview

### Frontend Architecture
The frontend uses a context-based architecture with custom hooks for separation of concerns:

- **NotesContext** (`frontend/src/context/NotesContext.jsx`) - Central state orchestrator that combines:
  - `useNotes` - Note CRUD operations and API calls
  - `useCanvas` - Canvas state (zoom, pan, selection)
  - `useConnections` - Note connection management
  - `useAI` - AI generation and summarization

- **Canvas Component** (`frontend/src/components/Canvas.jsx`) - Main canvas renderer using Konva.js:
  - Virtual rendering for performance (only renders visible notes)
  - Multi-select with bulk drag operations
  - Physics-based momentum system
  - Minimap navigation
  - Keyboard shortcuts

- **Custom Hooks**:
  - `useVirtualization` - Optimizes rendering of large note collections
  - `useMultiSelectDrag` - Handles multi-note selection and dragging
  - `useKeyboardShortcuts` - Global keyboard shortcut management

### Backend Architecture

The backend implements enterprise-grade file operations with atomic writes and security hardening:

- **File Operations** (`backend/utils/fileOperations.js`):
  - Atomic writes with temp file → rename pattern
  - SHA-256 checksums for integrity verification
  - Automatic backup creation and rotation (5 backups max)
  - File locking with exponential backoff retry (dev: 3 retries, prod: no retry)
  - Recovery from backup on corruption detection
  - Lock timeout: 2s dev, 10s prod

- **Security** (`backend/utils/security.js`):
  - Comprehensive input sanitization with HTML entity escaping
  - AI prompt injection detection (blocks suspicious patterns)
  - Rate limiting with in-memory store (use Redis in production)
  - Development-friendly rate limits (1000 req/min vs 100 req/15min prod)
  - XSS prevention via HTML entity encoding
  - Content length validation (titles: 200 chars, content: 50k chars)

- **API Routes** (`backend/server.js`):
  - `/api/notes` - CRUD operations for notes
  - `/api/ai/generate` - AI note generation with Ollama
  - `/api/ai/summarize` - Multi-note summarization
  - `/api/ai/questions` - Generate follow-up questions
  - `/api/health` - Health check with file integrity status

- **Connection Sync**: When note connections are updated, both notes in the relationship are automatically synced (bidirectional connection management)

## Important Implementation Details

### Development vs Production Modes

Set `NODE_ENV=development` for enhanced features:
- Rate limiting: 1000 requests/minute (vs 100/15min production)
- File lock timeout: 2 seconds (vs 10s production)
- File lock retries: 3 attempts with exponential backoff (vs no retry)
- Enhanced drag system with debounced API calls
- Error details exposed in API responses

### File Operations Pattern

All file writes MUST use atomic operations:
```javascript
// ✅ Correct - use atomic write
await atomicWrite(NOTES_FILE, notes)

// ❌ Wrong - direct fs write (no integrity checks)
await fs.writeFile(NOTES_FILE, JSON.stringify(notes))
```

Atomic write process:
1. Acquire exclusive lock with retry mechanism
2. Create backup of existing file (rotates 5 backups)
3. Write to temporary file
4. Generate and save SHA-256 checksum
5. Atomic rename (temp → main file)
6. Verify checksum integrity
7. Cleanup old backups
8. Release lock

### AI Integration (Ollama)

The app requires Ollama running locally at `http://localhost:11434`:
- Model configured via `OLLAMA_MODEL` env var (default: llama3)
- AI requests have separate rate limiting (10 requests per 10 minutes)
- Prompts are sanitized to prevent injection attacks
- Context from connected notes is included in generation

### Connection Management

Note connections are bidirectional and automatically synced:
- When creating note A with connection to B, B's connections are updated to include A
- When updating note A to remove connection to B, B's connections are cleaned
- When deleting note A, all references to A are removed from connected notes
- Connections stored as array of note IDs in each note object

### Canvas Rendering Performance

- Virtual rendering: Only notes in viewport + buffer are rendered
- Level of Detail (LOD): Simplified rendering at low zoom levels
- Optimized drag: Debounced API calls during multi-select drag
- Momentum physics: Smooth deceleration after drag release

## Common Development Tasks

### Adding a New API Endpoint
1. Add route in `backend/server.js`
2. Use security middleware: `security.validateNote` or `security.validateAI`
3. Apply appropriate rate limiter: `limiter` (general) or `aiLimiter` (AI endpoints)
4. Use `atomicWrite` and `safeRead` for file operations
5. Add security event logging with `logSecurityEvent`

### Testing File Operations
```bash
cd backend
npm run test:coverage  # See which edge cases need coverage
```

### Testing Security Features
```bash
cd backend
npm run test:security  # Run security validation tests
```

### Debugging Canvas Issues
Enable performance monitoring in `Canvas.jsx` by checking the `usePerformanceMonitor` hook output in console

### Running Tests Individually
```bash
# Backend
cd backend
npm test -- __tests__/security.test.js

# Frontend
cd frontend
npm test -- src/components/Canvas.test.jsx
```

## Key Files Reference

- `backend/server.js:142-179` - Atomic note read/write operations
- `backend/utils/fileOperations.js:172-226` - Atomic write implementation
- `backend/utils/security.js:202-267` - AI prompt validation and injection detection
- `frontend/src/context/NotesContext.jsx` - Central state management
- `frontend/src/components/Canvas.jsx` - Main canvas with virtualization
- `frontend/src/hooks/useNotes.js` - Note CRUD operations with API calls