#!/bin/bash

# Canvas Notes - Restart Application Script for Mac/Linux
# This script restarts both the backend and frontend servers

echo "🔄 Restarting Canvas Notes Application..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Stop the application
./stop-app.sh

# Wait a moment
sleep 2

# Start the application
./start-app.sh