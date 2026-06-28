/**
 * GameManager
 * Manages all active game rooms, player state, timers, and win conditions.
 */

const { generateRoomCode } = require('./utils');
const { MAP_WIDTH, MAP_HEIGHT, OBSTACLES, TAG_DISTANCE, GAME_DURATION_MS } = require('./constants');

class GameManager {
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Room>} roomCode → Room */
    this.rooms = new Map();
  }

  // ─── Room management ────────────────────────────────────────────────────────

  /**
   * Create a new room and add the creator as first player.
   * @returns {{ roomCode: string, error?: string }}
   */
  createRoom(socket, playerName) {
    // Ensure player isn't already in a room
    const existing = this._findRoomBySocket(socket.id);
    if (existing) return { error: 'You are already in a room.' };

    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
    } while (this.rooms.has(roomCode) && attempts < 100);

    const room = {
      code: roomCode,
      players: new Map(),   // socketId → Player
      state: 'waiting',     // 'waiting' | 'playing' | 'ended'
      timer: null,
      timeLeft: GAME_DURATION_MS / 1000,
      seekerId: null,
    };

    this.rooms.set(roomCode, room);
    this._addPlayerToRoom(socket, room, playerName, true);
    socket.join(roomCode);

    console.log(`[Room ${roomCode}] Created by ${playerName}`);
    return { roomCode };
  }

  /**
   * Join an existing room.
   * @returns {{ roomCode: string, error?: string }}
   */
  joinRoom(socket, roomCode, playerName) {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) return { error: 'Room not found.' };
    if (room.state !== 'waiting') return { error: 'Game already in progress.' };
    if (room.players.size >= 4) return { error: 'Room is full (max 4 players).' };

    // Prevent duplicate socket join
    if (room.players.has(socket.id)) return { error: 'Already in this room.' };

    // Check for duplicate name
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === playerName.toLowerCase()) {
        return { error: 'That name is taken in this room.' };
      }
    }

    this._addPlayerToRoom(socket, room, playerName, false);
    socket.join(code);

    console.log(`[Room ${code}] ${playerName} joined (${room.players.size}/4)`);
    return { roomCode: code };
  }

  /**
   * Remove player from their current room. Clean up empty rooms.
   */
  removePlayer(socketId) {
    const { room, roomCode } = this._findRoomBySocket(socketId) || {};
    if (!room) return;

    const player = room.players.get(socketId);
    const wasHost = player?.isHost;
    room.players.delete(socketId);

    console.log(`[Room ${roomCode}] ${player?.name} left`);

    if (room.players.size === 0) {
      // Empty room – clean up
      if (room.timer) clearInterval(room.timer);
      this.rooms.delete(roomCode);
      console.log(`[Room ${roomCode}] Deleted (empty)`);
      return;
    }

    // If host left, assign new host
    if (wasHost) {
      const newHost = room.players.values().next().value;
      newHost.isHost = true;
    }

    // If game was running, check win conditions
    if (room.state === 'playing') {
      this._checkWinCondition(room, roomCode);
    }

    this._broadcastRoomState(roomCode, room);
  }

  // ─── Game lifecycle ─────────────────────────────────────────────────────────

  /**
   * Host starts the game.
   */
  startGame(socketId) {
    const { room, roomCode } = this._findRoomBySocket(socketId) || {};
    if (!room) return { error: 'Not in a room.' };

    const player = room.players.get(socketId);
    if (!player?.isHost) return { error: 'Only the host can start.' };
    if (room.players.size < 2) return { error: 'Need at least 2 players.' };
    if (room.state !== 'waiting') return { error: 'Game already started.' };

    // Pick random seeker
    const playerIds = [...room.players.keys()];
    const seekerIdx = Math.floor(Math.random() * playerIds.length);
    const seekerId = playerIds[seekerIdx];
    room.seekerId = seekerId;

    // Set roles and spawn positions
    const spawnPoints = this._generateSpawnPoints(room.players.size);
    let i = 0;
    for (const [id, p] of room.players) {
      p.role = id === seekerId ? 'seeker' : 'hider';
      p.status = 'active';
      p.x = spawnPoints[i].x;
      p.y = spawnPoints[i].y;

      console.log(p.name, "spawn:", p.x, p.y);

      i++;
    }

    room.state = 'playing';
    room.timeLeft = GAME_DURATION_MS / 1000;

    // Broadcast game start with full state
    this.io.to(roomCode).emit('gameStarted', {
      players: this._serializePlayers(room),
      seekerId,
      timeLeft: room.timeLeft,
    });

    // Start countdown timer (ticks every second)
    room.timer = setInterval(() => {
      room.timeLeft--;
      this.io.to(roomCode).emit('timerTick', { timeLeft: room.timeLeft });

      if (room.timeLeft <= 0) {
        this._endGame(room, roomCode, 'hiders');
      }
    }, 1000);

    console.log(`[Room ${roomCode}] Game started! Seeker: ${room.players.get(seekerId)?.name}`);
    return { ok: true };
  }

  // ─── Movement & tagging ─────────────────────────────────────────────────────

  /**
   * Update player position (sent by client on every move).
   * Also checks tag collisions server-side.
   */
  updatePlayerPosition(socketId, x, y, direction) {
    const { room, roomCode } = this._findRoomBySocket(socketId) || {};
    if (!room || room.state !== 'playing') return;

    const player = room.players.get(socketId);
    if (!player || player.status !== 'active') return;

    // Clamp to map bounds
    player.x = Math.max(0, Math.min(MAP_WIDTH, x));
    player.y = Math.max(0, Math.min(MAP_HEIGHT, y));
    player.direction = direction;

    // Broadcast movement to others in room
    this.io.to(roomCode).emit('playerMoved', {
      id: socketId,
      x: player.x,
      y: player.y,
      direction,
    });

    // Tag detection (only seeker can tag)
    if (player.role === 'seeker') {
      for (const [id, hider] of room.players) {
        if (id === socketId) continue;
        if (hider.role !== 'hider' || hider.status !== 'active') continue;

        const dist = Math.hypot(player.x - hider.x, player.y - hider.y);
        if (dist <= TAG_DISTANCE) {
          hider.status = 'tagged';
          this.io.to(roomCode).emit('playerTagged', { id, taggedBy: socketId });
          console.log(`[Room ${roomCode}] ${hider.name} tagged!`);
          this._checkWinCondition(room, roomCode);
        }
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _addPlayerToRoom(socket, room, playerName, isHost) {
    const spawn = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName.trim().substring(0, 16),
      isHost,
      role: null,
      status: 'waiting',
      x: spawn.x,
      y: spawn.y,
      direction: 'down',
      color: this._assignColor(room.players.size),
    });
    this._broadcastRoomState(room.code, room);
  }

  _broadcastRoomState(roomCode, room) {
    this.io.to(roomCode).emit('roomState', {
      roomCode,
      players: this._serializePlayers(room),
      state: room.state,
    });
  }

  _serializePlayers(room) {
    const out = {};
    for (const [id, p] of room.players) {
      out[id] = { ...p };
    }
    return out;
  }

  _findRoomBySocket(socketId) {
    for (const [roomCode, room] of this.rooms) {
      if (room.players.has(socketId)) return { room, roomCode };
    }
    return null;
  }

  _checkWinCondition(room, roomCode) {
    if (room.state !== 'playing') return;

    const activePlayers = [...room.players.values()].filter(p => p.status === 'active');
    const activeHiders = activePlayers.filter(p => p.role === 'hider');
    const seekerAlive = activePlayers.some(p => p.role === 'seeker');

    if (!seekerAlive) {
      // Seeker disconnected – hiders win
      this._endGame(room, roomCode, 'hiders');
    } else if (activeHiders.length === 0) {
      // All hiders tagged – seeker wins
      this._endGame(room, roomCode, 'seeker');
    }
  }

  _endGame(room, roomCode, winner) {
    if (room.state === 'ended') return;
    room.state = 'ended';
    if (room.timer) clearInterval(room.timer);

    this.io.to(roomCode).emit('gameEnded', {
      winner,
      players: this._serializePlayers(room),
    });

    // Reset to waiting after 10 seconds
    setTimeout(() => {
      if (!this.rooms.has(roomCode)) return;
      room.state = 'waiting';
      room.seekerId = null;
      for (const p of room.players.values()) {
        p.role = null;
        p.status = 'waiting';
      }
      this._broadcastRoomState(roomCode, room);
    }, 10000);

    console.log(`[Room ${roomCode}] Game ended! Winner: ${winner}`);
  }

_generateSpawnPoints(count) {
  const points = [
    { x: 250,  y: 250 },
    { x: 1350, y: 250 },
    { x: 250,  y: 950 },
    { x: 1350, y: 950 }
  ];

  return points.slice(0, count);
}

  _assignColor(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
    return colors[index % colors.length];
  }

  getRoomInfo(roomCode) {
    return this.rooms.get(roomCode) || null;
  }
}

module.exports = { GameManager };
