#!/bin/bash
# Test if the built server can start locally
cd backend
echo "Testing server startup..."
NODE_ENV=production timeout 10 node dist/server.js 2>&1 | head -50
