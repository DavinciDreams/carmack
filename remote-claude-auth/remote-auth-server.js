#!/usr/bin/env node
// Emergency Claude Code Remote Auth Server for DOOM Release
// Serves authentication tokens across network

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8877;
const CONFIG_PATH = path.join(os.homedir(), '.config', 'claude-code', 'config.json');

// Simple token extraction from local config
function getLocalToken() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            return config.primaryApiKey || null;
        }
    } catch (err) {
        console.error('Error reading config:', err.message);
    }
    
    // Fallback to environment
    return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN || null;
}

const server = http.createServer((req, res) => {
    // CORS headers for remote access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/auth/token' && req.method === 'GET') {
        const token = getLocalToken();
        
        if (!token) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'No token found',
                instructions: 'Run: claude && /login on this machine first'
            }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            token: token,
            timestamp: new Date().toISOString(),
            message: 'DOOM-ready token served!'
        }));
        console.log(`🎯 Token served to ${req.socket.remoteAddress}`);
        return;
    }
    
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('DOOM Auth Server OK');
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DOOM Claude Auth Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Remote machines can fetch token from: http://YOUR_IP:${PORT}/auth/token`);
    console.log(`🔍 Health check: http://YOUR_IP:${PORT}/health`);
    
    // Show local IP for convenience
    const nets = os.networkInterfaces();
    Object.keys(nets).forEach(name => {
        nets[name].forEach(net => {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`🌐 Your IP: http://${net.address}:${PORT}/auth/token`);
            }
        });
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 DOOM Auth Server shutting down...');
    server.close();
    process.exit(0);
});