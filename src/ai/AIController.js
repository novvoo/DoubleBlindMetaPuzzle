import { PLAYERS, DIRECTIONS, PROPERTIES } from '../game/constants.js';

/**
 * AI 控制器 - 让两个 AI 自动合作解谜
 * 
 * 策略：
 * 1. 站在未揭示规则格上 → 使用揭示令牌
 * 2. 旗帜可见且可达 → BFS寻路到旗帜
 * 3. 探索未知区域 → 向迷雾边缘移动
 * 4. 合作：利用对方揭示的规则更新认知
 */
export class AIController {
  constructor(game) {
    this.game = game;
    // Track failed moves to avoid loops
    this.failedMoves = { A: new Set(), B: new Set() };
    this.stuckCounter = { A: 0, B: 0 };
  }

  /**
   * 为当前玩家决定下一步行动
   * @param {string} player - 'A' or 'B'
   * @param {object|null} lastFailedDir - 上次失败的方向，用于排除
   */
  decide(player, lastFailedDir = null) {
    const state = this.game.state;
    const pos = state.getPlayerPosition(player);
    if (!pos) return { action: 'wait', player };

    const posKey = `${pos.x},${pos.y}`;

    // Track failed move
    if (lastFailedDir) {
      const dirKey = `${posKey}->${lastFailedDir.name}`;
      this.failedMoves[player].add(dirKey);
      this.stuckCounter[player]++;
    } else {
      this.stuckCounter[player] = Math.max(0, this.stuckCounter[player] - 1);
      // Clear failed moves when position changes
      this.failedMoves[player].clear();
    }

    // 1. 如果站在未揭示规则格上，且有揭示令牌 → 揭示
    if (this._shouldReveal(player, pos.x, pos.y)) {
      return { action: 'reveal', player };
    }

    // 2. 寻找旗帜并尝试到达
    const flagPos = this._findVisibleFlag(player);
    if (flagPos) {
      const path = this._findPath(player, pos.x, pos.y, flagPos.x, flagPos.y);
      if (path && path.length > 0) {
        const dir = this._directionFromDelta(path[0].x - pos.x, path[0].y - pos.y);
        if (dir && !this._isFailedMove(player, posKey, dir)) {
          return { action: 'move', player, direction: dir };
        }
      }
    }

    // 3. 探索未知区域
    const exploreDirection = this._exploreDirection(player, pos.x, pos.y);
    if (exploreDirection && !this._isFailedMove(player, posKey, exploreDirection)) {
      return { action: 'move', player, direction: exploreDirection };
    }

    // 4. 如果 stuck 太多次，尝试任意可行方向
    if (this.stuckCounter[player] > 2) {
      const anyDir = this._tryAnyDirection(player, pos.x, pos.y);
      if (anyDir) {
        return { action: 'move', player, direction: anyDir };
      }
    }

    // 5. 无路可走 → 等待
    return { action: 'wait', player };
  }

  _isFailedMove(player, posKey, dir) {
    return this.failedMoves[player].has(`${posKey}->${dir.name}`);
  }

  // ---- 内部方法 ----

  _shouldReveal(player, x, y) {
    const state = this.game.state;
    const cell = state.grid.cells[y][x];
    if (!cell || !cell.rules || cell.rules.length === 0) return false;
    if (state.isRuleRevealed(x, y)) return false;
    if (!state.hasRevealToken(player)) return false;
    return true;
  }

  _findVisibleFlag(player) {
    const state = this.game.state;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (!state.isRevealedTo(player, x, y)) continue;
        const cell = state.grid.cells[y][x];
        const entities = cell.entities || [];
        for (const e of entities) {
          if (e.type === 'flag') return { x, y };
        }
      }
    }
    return null;
  }

  /**
   * BFS寻路，只经过该玩家已揭示的格子
   * 考虑玩家自身规则和已揭示的全局规则
   */
  _findPath(player, fromX, fromY, toX, toY) {
    const state = this.game.state;
    const w = state.width;
    const h = state.height;

    const visited = new Set();
    const queue = [{ x: fromX, y: fromY, path: [] }];
    visited.add(`${fromX},${fromY}`);

    const baseDirs = [
      { dx: 0, dy: -1 },  // UP
      { dx: 1, dy: 0 },   // RIGHT
      { dx: 0, dy: 1 },   // DOWN
      { dx: -1, dy: 0 },  // LEFT
    ];
    // 随机打乱 BFS 方向顺序
    const dirs = this._shuffleDirs(baseDirs);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.x === toX && current.y === toY) {
        return current.path;
      }

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (!state.isRevealedTo(player, nx, ny)) continue;

        if (this._canStepInto(player, nx, ny)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...current.path, { x: nx, y: ny }],
          });
        }
      }
    }

    return null; // 无路径
  }

  /**
   * 玩家能否踏入目标格（基于该玩家的规则 + 对方揭示的规则）
   */
  _canStepInto(player, x, y) {
    const state = this.game.state;
    const cell = state.grid.cells[y][x];

    // 墙壁检查
    if (cell.terrain === 'wall') {
      const wallProp = this._getEffectiveProperty(player, 'wall');
      if (wallProp === PROPERTIES.STOP) return false;
      // PUSH on wall means can push through? In this game, wall is terrain, not entity
      // Actually looking at _checkMove in GameEngine - wall with STOP blocks
      // But wall with PUSH or other also blocks because terrain can't be pushed?
      // Let me check engine: _checkMove checks wall property === STOP → blocked
      // If wall property is not STOP, it falls through... so WALL IS PUSH means wall doesn't block
      // Actually wait, in the engine: if wallProperty === STOP → can't move. Otherwise it continues.
      // So WALL IS PUSH effectively means wall doesn't block, but push onto wall doesn't work
      // because terrain isn't an entity you can push.
      // Let me just check if the property is STOP.
    }

    // 实体检查
    const entities = cell.entities || [];
    for (const entity of entities) {
      const prop = this._getEffectiveProperty(player, entity.type);
      if (prop === PROPERTIES.STOP) return false;
    }

    return true;
  }

  /**
   * 获取玩家对某实体类型的"有效"属性
   * 综合玩家自身规则 + 任何一方已揭示的规则
   */
  _getEffectiveProperty(player, entityType) {
    const state = this.game.state;
    // 检查已揭示规则中是否有关于此实体的
    for (const revealed of state.revealedRules) {
      if (revealed.rule.entity.toLowerCase() === entityType.toLowerCase()) {
        return revealed.rule.property.toLowerCase();
      }
    }
    // 回退到玩家自身规则
    return state.getEntityProperty(player, entityType);
  }

  /**
   * 探索策略：向有未揭示邻居的已揭示格移动
   * 方向随机化，避免固定偏向
   */
  _exploreDirection(player, x, y) {
    const state = this.game.state;
    const w = state.width;
    const h = state.height;

    // 先找所有已揭示格中，有未揭示邻居的边缘格
    const frontierCells = [];
    const visitedGlobal = new Set();

    const baseDirs = [
      { dx: 0, dy: -1, dir: DIRECTIONS.UP },
      { dx: 1, dy: 0, dir: DIRECTIONS.RIGHT },
      { dx: 0, dy: 1, dir: DIRECTIONS.DOWN },
      { dx: -1, dy: 0, dir: DIRECTIONS.LEFT },
    ];
    // 随机打乱方向顺序，避免固定偏好
    const dirs = this._shuffleDirs(baseDirs);

    // BFS from current position to find nearest frontier
    const queue = [{ x, y, dist: 0 }];
    visitedGlobal.add(`${x},${y}`);

    while (queue.length > 0) {
      const cur = queue.shift();

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;

        if (visitedGlobal.has(key)) continue;
        visitedGlobal.add(key);

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

        // Check if this neighbor is unrevealed (fog) → this is a frontier!
        if (!state.isRevealedTo(player, nx, ny)) {
          // Can we step into current cell? If so, moving toward this direction explores
          if (this._canStepInto(player, cur.x, cur.y)) {
            frontierCells.push({
              targetX: cur.x,
              targetY: cur.y,
              dist: cur.dist,
              firstStepDir: cur.dist === 0
                ? d.dir  // directly adjacent
                : null,   // we'll compute first step from path
            });
          }
          continue;
        }

        // If revealed and passable, continue BFS
        if (this._canStepInto(player, nx, ny)) {
          queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
        }
      }
    }

    if (frontierCells.length === 0) return null;

    // Sort by distance, pick nearest
    frontierCells.sort((a, b) => a.dist - b.dist);

    // For the nearest frontier, find the path
    const best = frontierCells[0];
    if (best.dist === 0) {
      // Already adjacent to fog - move into fog
      return best.firstStepDir;
    }

    // Pathfind to the frontier cell
    const path = this._findPath(player, x, y, best.targetX, best.targetY);
    if (path && path.length > 0) {
      const firstStep = path[0];
      return this._directionFromDelta(firstStep.x - x, firstStep.y - y);
    }

    return null;
  }

  _directionFromDelta(dx, dy) {
    if (dx === 0 && dy === -1) return DIRECTIONS.UP;
    if (dx === 1 && dy === 0) return DIRECTIONS.RIGHT;
    if (dx === 0 && dy === 1) return DIRECTIONS.DOWN;
    if (dx === -1 && dy === 0) return DIRECTIONS.LEFT;
    return null;
  }

  /**
   * 随机打乱方向数组
   */
  _shuffleDirs(dirs) {
    const arr = [...dirs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 备选方案：随机尝试所有方向中第一个可行的
   */
  _tryAnyDirection(player, x, y) {
    const baseDirs = [DIRECTIONS.UP, DIRECTIONS.RIGHT, DIRECTIONS.DOWN, DIRECTIONS.LEFT];
    const dirs = this._shuffleDirs(baseDirs);
    for (const dir of dirs) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx >= 0 && nx < this.game.state.width &&
          ny >= 0 && ny < this.game.state.height) {
        if (this._canStepInto(player, nx, ny)) {
          return dir;
        }
      }
    }
    return null;
  }
}
