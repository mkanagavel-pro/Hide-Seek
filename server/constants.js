/**
 * Game Constants
 * Shared configuration values used across server modules.
 * These mirror the values in public/js/constants.js for consistency.
 */

// Map dimensions in pixels
const MAP_WIDTH  = 1600;
const MAP_HEIGHT = 1200;

// Distance (px) at which seeker tags a hider
const TAG_DISTANCE = 36;

// Match duration in milliseconds (3 minutes)
const GAME_DURATION_MS = 3 * 60 * 1000;

// Maximum players per room
const MAX_PLAYERS = 4;

// Obstacle definitions – mirrors client map data
// Used for server-side boundary validation if needed
const OBSTACLES = [];

module.exports = {
  MAP_WIDTH,
  MAP_HEIGHT,
  TAG_DISTANCE,
  GAME_DURATION_MS,
  MAX_PLAYERS,
  OBSTACLES,
};
