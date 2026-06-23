export const PLAYERS = {
  A: 'A',
  B: 'B'
};

export const PLAYER = PLAYERS;

export const DIRECTIONS = {
  UP: { x: 0, y: -1, name: 'up' },
  DOWN: { x: 0, y: 1, name: 'down' },
  LEFT: { x: -1, y: 0, name: 'left' },
  RIGHT: { x: 1, y: 0, name: 'right' }
};

export const DIRECTION = DIRECTIONS;

export const ENTITY_TYPES = {
  EMPTY: 'empty',
  WALL: 'wall',
  RULE_BLOCK: 'rule_block',
  BABA: 'baba',
  KEKE: 'keke',
  FLAG: 'flag',
  FLOOR: 'floor',
  PLAYER_A: 'player_a',
  PLAYER_B: 'player_b',
};

export const PROPERTIES = {
  NONE: 'none',
  STOP: 'stop',
  PUSH: 'push',
  WIN: 'win',
  YOU: 'you',
};

export const CELL_TYPES = {
  TERRAIN: 'terrain',
  ENTITY: 'entity',
  CHARACTER: 'character'
};

export const MESSAGE_TYPES = {
  MOVE: 'move',
  REVEAL: 'reveal',
  SYSTEM: 'system',
  ERROR: 'error',
  WIN: 'win',
  WARNING: 'warning',
};

export const MAX_REVEAL_TOKENS = 3;