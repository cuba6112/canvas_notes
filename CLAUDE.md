# CLAUDE.md

Canvas Notes - Interactive sticky notes app with AI integration

## Quick Start
```bash
# Backend (from /backend): NODE_ENV=development node server.js (port 5001)
# Frontend (from /frontend): npm run dev (port 5174)
```

## Key Commands
- **Backend**: `node server.js`, `npm test`
- **Frontend**: `npm run dev`, `npm run build`, `npm test`
- **Development**: Use `NODE_ENV=development` for enhanced drag system

## Tech Stack
- **Frontend**: React + Vite + Konva.js (canvas)
- **Backend**: Express.js + Ollama AI
- **Storage**: JSON file with atomic operations

## Important Files
- `backend/server.js` - Main server
- `frontend/src/components/Canvas.jsx` - Main canvas
- `backend/utils/fileOperations.js` - File operations with locking
- `backend/utils/security.js` - Security & rate limiting

## Recent Enhancements
- ✅ Physics-based momentum drag system
- ✅ Multi-select bulk note movement
- ✅ Interactive minimap navigation
- ✅ Comprehensive keyboard shortcuts
- ✅ Development-optimized rate limiting (1000 req/min)
- ✅ Smart file locking with retry mechanism

## Development Notes
- Rate limiting: 1000/min dev, 100/15min prod
- File locks: 2s timeout dev, 10s prod with retry
- Enhanced drag system uses debounced API calls
- Canvas supports momentum, physics, and smooth animations