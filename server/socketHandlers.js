/**
 * Socket Handlers
 * Registers all Socket.IO event listeners for a connected client.
 *
 * Events (client → server):
 *   createRoom       { playerName }
 *   joinRoom         { roomCode, playerName }
 *   startGame        {}
 *   playerMove       { x, y, direction }
 *   disconnect       (built-in)
 *
 * Events (server → client):
 *   roomCreated      { roomCode, players, state }
 *   joinedRoom       { roomCode, players, state }
 *   roomState        { roomCode, players, state }
 *   gameStarted      { players, seekerId, timeLeft }
 *   playerMoved      { id, x, y, direction }
 *   playerTagged     { id, taggedBy }
 *   timerTick        { timeLeft }
 *   gameEnded        { winner, players }
 *   error            { message }
 */

function setupSocketHandlers(socket, io, gameManager) {

  // ─── Create a new room ──────────────────────────────────────────────────────
  socket.on('createRoom', ({ playerName }) => {
    if (!validateName(playerName)) {
      return socket.emit('error', { message: 'Invalid player name (1–16 chars).' });
    }
    const result = gameManager.createRoom(socket, playerName);
    if (result.error) return socket.emit('error', { message: result.error });

    const room = gameManager.getRoomInfo(result.roomCode);
    socket.emit('roomCreated', {
      roomCode: result.roomCode,
      players: serializePlayers(room),
      state: room.state,
      myId: socket.id,
    });
  });

  // ─── Join an existing room ──────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    if (!validateName(playerName)) {
      return socket.emit('error', { message: 'Invalid player name (1–16 chars).' });
    }
    if (!roomCode || roomCode.length !== 6) {
      return socket.emit('error', { message: 'Room code must be 6 characters.' });
    }

    const result = gameManager.joinRoom(socket, roomCode, playerName);
    if (result.error) return socket.emit('error', { message: result.error });

    const room = gameManager.getRoomInfo(result.roomCode);
    socket.emit('joinedRoom', {
      roomCode: result.roomCode,
      players: serializePlayers(room),
      state: room.state,
      myId: socket.id,
    });
  });

  // ─── Host starts the game ───────────────────────────────────────────────────
  socket.on('startGame', () => {
    const result = gameManager.startGame(socket.id);
    if (result?.error) return socket.emit('error', { message: result.error });
  });

  // ─── Player movement (sent frequently) ─────────────────────────────────────
  socket.on('playerMove', ({ x, y, direction }) => {
    // Basic sanity check
    if (typeof x !== 'number' || typeof y !== 'number') return;
    gameManager.updatePlayerPosition(socket.id, x, y, direction);
  });

  // ─── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[-] Client disconnected: ${socket.id} (${reason})`);
    gameManager.removePlayer(socket.id);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 16;
}

function serializePlayers(room) {
  if (!room) return {};
  const out = {};
  for (const [id, p] of room.players) out[id] = { ...p };
  return out;
}

module.exports = { setupSocketHandlers };
