# Canvas Notes - Shell Scripts for Mac/Linux

This directory contains shell scripts to easily manage the Canvas Notes application on Mac and Linux systems.

## 📋 Available Scripts

### 🚀 `start-app.sh`
Starts both the backend and frontend servers.

```bash
./start-app.sh
```

**What it does:**
- Checks if Node.js and npm are installed
- Installs dependencies if needed
- Starts backend server on port 5001 (development mode)
- Starts frontend server on port 5174
- Creates log files in `logs/` directory
- Saves process IDs for easy management

**Output:**
```
🚀 Starting Canvas Notes Application...
📦 Installing dependencies... (if needed)
🔧 Starting backend server (port 5001)...
✅ Backend server started (PID: 12345)
🎨 Starting frontend server (port 5174)...
✅ Frontend server started (PID: 12346)

✨ Canvas Notes is running!

📍 Backend:  http://localhost:5001
📍 Frontend: http://localhost:5174

📝 Logs:
   Backend:  logs/backend.log
   Frontend: logs/frontend.log

🛑 To stop the servers, run: ./stop-app.sh
```

---

### 🛑 `stop-app.sh`
Stops both the backend and frontend servers.

```bash
./stop-app.sh
```

**What it does:**
- Gracefully stops backend and frontend servers
- Force kills if processes don't stop gracefully
- Cleans up any orphaned processes
- Removes PID files

**Output:**
```
🛑 Stopping Canvas Notes Application...
Stopping Backend server (PID: 12345)...
✅ Backend server stopped
Stopping Frontend server (PID: 12346)...
✅ Frontend server stopped

✨ Canvas Notes stopped successfully
```

---

### 🔄 `restart-app.sh`
Restarts the entire application.

```bash
./restart-app.sh
```

**What it does:**
- Runs `stop-app.sh` to stop all servers
- Waits 2 seconds
- Runs `start-app.sh` to start all servers

---

### 📊 `status-app.sh`
Checks the status of all servers and provides detailed information.

```bash
./status-app.sh
```

**What it does:**
- Shows running status of backend and frontend
- Displays PID, memory usage, and CPU usage
- Checks if ports are listening
- Performs health check on backend API
- Shows log file sizes
- Lists available commands

**Example Output:**
```
📊 Canvas Notes Application Status
==================================

Backend Server:
  Status: Running ✅
  PID: 12345
  Port: 5001 (listening)
  Memory: 45MB
  CPU: 0.5%

Frontend Server:
  Status: Running ✅
  PID: 12346
  Port: 5174 (listening)
  Memory: 120MB
  CPU: 1.2%

Health Check:
  Backend API: Healthy ✅
  Uptime: 15.5 minutes

Log Files:
  Backend log: 2.3K
  Frontend log: 15K

💡 Available commands:
  ./start-app.sh    - Start the application
  ./stop-app.sh     - Stop the application
  ./restart-app.sh  - Restart the application
  ./status-app.sh   - Check application status
```

---

## 🔧 Installation

The scripts are already executable. If you need to make them executable manually:

```bash
chmod +x *.sh
```

---

## 📝 Log Files

All logs are stored in the `logs/` directory:

- `logs/backend.log` - Backend server output
- `logs/frontend.log` - Frontend server output
- `logs/backend.pid` - Backend process ID
- `logs/frontend.pid` - Frontend process ID

To view logs in real-time:

```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log
```

---

## 🐛 Troubleshooting

### Port Already in Use

If you get an error that a port is already in use:

```bash
# Find what's using port 5001 (backend)
lsof -i :5001

# Find what's using port 5174 (frontend)
lsof -i :5174

# Kill the process
kill -9 <PID>

# Or use the stop script
./stop-app.sh
```

### Scripts Not Running

Make sure scripts are executable:

```bash
ls -l *.sh
# Should show: -rwxr-xr-x

# If not, run:
chmod +x *.sh
```

### Dependencies Not Installed

The start script will automatically install dependencies, but you can do it manually:

```bash
# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Checking if Application is Running

Use the status script:

```bash
./status-app.sh
```

Or manually check processes:

```bash
# Check backend
pgrep -f "node server.js"

# Check frontend
pgrep -f "vite"
```

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `./start-app.sh` | Start the application |
| `./stop-app.sh` | Stop the application |
| `./restart-app.sh` | Restart the application |
| `./status-app.sh` | Check application status |
| `tail -f logs/backend.log` | View backend logs |
| `tail -f logs/frontend.log` | View frontend logs |

---

## 🔗 URLs

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:5001
- **Health Check:** http://localhost:5001/api/health

---

## 💡 Tips

1. **Auto-open browser:** Uncomment the last line in `start-app.sh` to automatically open the app in your browser when starting.

2. **Check logs regularly:** Use `./status-app.sh` to monitor resource usage and check for issues.

3. **Restart on changes:** If you modify server code, use `./restart-app.sh` to apply changes.

4. **Clean start:** Stop the app, delete the `logs/` directory, and start again for a fresh state.

---

## 📚 Additional Documentation

For more information about the project, see:
- [Main README](README.md) - Project overview and setup
- [CLAUDE.md](CLAUDE.md) - Development guidelines for Claude Code
- [Backend README](backend/README.md) - Backend-specific documentation (if available)
- [Frontend README](frontend/README.md) - Frontend-specific documentation (if available)