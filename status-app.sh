#!/bin/bash

# Canvas Notes - Status Check Script for Mac/Linux
# This script checks the status of backend and frontend servers

echo "📊 Canvas Notes Application Status"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check process status
check_process() {
    local name=$1
    local pid_file=$2
    local port=$3

    echo -e "${BLUE}$name:${NC}"

    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "  Status: ${GREEN}Running ✅${NC}"
            echo "  PID: $PID"

            # Check if port is actually listening
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "  Port: ${GREEN}$port (listening)${NC}"
            else
                echo -e "  Port: ${YELLOW}$port (not listening)${NC}"
            fi

            # Show memory usage
            MEM=$(ps -o rss= -p $PID 2>/dev/null)
            if [ ! -z "$MEM" ]; then
                MEM_MB=$((MEM / 1024))
                echo "  Memory: ${MEM_MB}MB"
            fi

            # Show CPU usage
            CPU=$(ps -o %cpu= -p $PID 2>/dev/null | tr -d ' ')
            if [ ! -z "$CPU" ]; then
                echo "  CPU: ${CPU}%"
            fi
        else
            echo -e "  Status: ${RED}Not running ❌${NC}"
            echo "  (PID file exists but process is not running)"
        fi
    else
        echo -e "  Status: ${RED}Not running ❌${NC}"
        echo "  (No PID file found)"

        # Check if port is in use by another process
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            OTHER_PID=$(lsof -Pi :$port -sTCP:LISTEN -t)
            echo -e "  ${YELLOW}⚠️  Port $port is in use by another process (PID: $OTHER_PID)${NC}"
        fi
    fi

    echo ""
}

# Check backend status
check_process "Backend Server" "logs/backend.pid" "5001"

# Check frontend status
check_process "Frontend Server" "logs/frontend.pid" "5174"

# Check for any orphaned node processes
echo -e "${BLUE}Additional Processes:${NC}"
BACKEND_PROCS=$(pgrep -f "node server.js" | wc -l | tr -d ' ')
FRONTEND_PROCS=$(pgrep -f "vite" | wc -l | tr -d ' ')

if [ "$BACKEND_PROCS" -gt 0 ]; then
    echo "  Backend processes: $BACKEND_PROCS"
fi

if [ "$FRONTEND_PROCS" -gt 0 ]; then
    echo "  Frontend processes: $FRONTEND_PROCS"
fi

if [ "$BACKEND_PROCS" -eq 0 ] && [ "$FRONTEND_PROCS" -eq 0 ]; then
    echo -e "  ${YELLOW}No additional processes found${NC}"
fi

echo ""

# Check health endpoint if backend is running
if [ -f "logs/backend.pid" ]; then
    PID=$(cat "logs/backend.pid")
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${BLUE}Health Check:${NC}"
        HEALTH_CHECK=$(curl -s http://localhost:5001/api/health 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}Backend API: Healthy ✅${NC}"
            # Extract and display key health metrics
            STATUS=$(echo $HEALTH_CHECK | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            UPTIME=$(echo $HEALTH_CHECK | grep -o '"uptime":[^,}]*' | cut -d':' -f2)
            if [ ! -z "$UPTIME" ]; then
                UPTIME_MINS=$(echo "scale=2; $UPTIME / 60" | bc 2>/dev/null)
                echo "  Uptime: ${UPTIME_MINS} minutes"
            fi
        else
            echo -e "  ${RED}Backend API: Not responding ❌${NC}"
        fi
        echo ""
    fi
fi

# Show log file sizes
echo -e "${BLUE}Log Files:${NC}"
if [ -f "logs/backend.log" ]; then
    SIZE=$(du -h logs/backend.log | cut -f1)
    echo "  Backend log: $SIZE"
else
    echo "  Backend log: Not found"
fi

if [ -f "logs/frontend.log" ]; then
    SIZE=$(du -h logs/frontend.log | cut -f1)
    echo "  Frontend log: $SIZE"
else
    echo "  Frontend log: Not found"
fi

echo ""
echo "=================================="
echo ""

# Provide helpful commands
echo "💡 Available commands:"
echo "  ./start-app.sh    - Start the application"
echo "  ./stop-app.sh     - Stop the application"
echo "  ./restart-app.sh  - Restart the application"
echo "  ./status-app.sh   - Check application status (this script)"
echo ""