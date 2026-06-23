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

export const MAX_REVEAL_TOKENS = 3;      // 初始揭示令牌数
export const REVEAL_TOKEN_INTERVAL = 10; // 每 N 步自动获得 1 个揭示令牌
export const REVEAL_TOKEN_CAP = 5;       // 揭示令牌持有上限
export const DARK_FOG_INTERVAL = 3;      // 每 N 步（全局）生成 1 批暗雾
export const DARK_FOG_MAX = 8;           // 棋盘暗雾格子上限