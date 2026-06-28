/**
 * Hide & Seek Multiplayer Game Server
 * Entry point: sets up Express, Socket.IO, and starts listening.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupSocketHandlers } = require('./socketHandlers');
const { GameManager } = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 10000,
  pingInterval: 5000,
});

const PORT = process.env.PORT || 3000;

// ─── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Catch-all: serve index.html for any unmatched route ─────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Game state ───────────────────────────────────────────────────────────────
const gameManager = new GameManager(io);

// ─── Socket events ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);
  setupSocketHandlers(socket, io, gameManager);
});

// ─── Start server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🎮  Hide & Seek server running at http://localhost:${PORT}\n`);
});
