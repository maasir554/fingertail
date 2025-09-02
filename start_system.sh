#!/bin/bash

# Behavioral Authentication System Startup Script
# This script starts both the React Native app and Python backend

echo "🚀 Starting Behavioral Authentication System..."
echo "=============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating Python virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "📥 Installing Node.js dependencies..."
npm install

echo ""
echo "🎯 Starting Python ML Backend..."
echo "   API Server will be available at: http://localhost:5000"
echo "   Press Ctrl+C to stop the backend"
echo ""

# Start Python backend in background
python api_server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

echo ""
echo "📱 Starting React Native App..."
echo "   Development server will be available at: http://localhost:8081"
echo "   Press Ctrl+C to stop the app"
echo ""

# Start React Native app
npm start

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    
    # Stop backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Python backend stopped"
    fi
    
    # Deactivate virtual environment
    deactivate 2>/dev/null
    
    echo "✅ All services stopped"
    echo "👋 Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
echo ""
echo "🔄 System is running. Press Ctrl+C to stop all services."
wait
