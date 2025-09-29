#!/bin/bash

# Canvas Notes - Stop Application Script for Mac/Linux
# This script stops both the backend and frontend servers

echo "🛑 Stopping Canvas Notes Application..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to stop a process by PID file
stop_process() {
    local name=$1
    local pid_file=$2

    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping $name (PID: $PID)...${NC}"
            kill $PID
            sleep 1

            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${YELLOW}Force stopping $name...${NC}"
                kill -9 $PID 2>/dev/null
            fi

            echo -e "${GREEN}✅ $name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file found for $name${NC}"
    fi
}

# Stop backend
stop_process "Backend server" "logs/backend.pid"

# Stop frontend
stop_process "Frontend server" "logs/frontend.pid"

# Also kill any remaining node processes running server.js or vite
echo ""
echo -e "${YELLOW}Checking for any remaining processes...${NC}"

# Kill backend processes
BACKEND_PIDS=$(pgrep -f "node server.js")
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "Found additional backend processes: $BACKEND_PIDS"
    echo $BACKEND_PIDS | xargs kill 2>/dev/null
fi

# Kill frontend processes
FRONTEND_PIDS=$(pgrep -f "vite")
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "Found additional frontend processes: $FRONTEND_PIDS"
    echo $FRONTEND_PIDS | xargs kill 2>/dev/null
fi

echo ""
echo -e "${GREEN}✨ Canvas Notes stopped successfully${NC}"
echo ""