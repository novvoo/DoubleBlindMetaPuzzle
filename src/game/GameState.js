import { PLAYERS, PROPERTIES, REVEAL_TOKEN_INTERVAL, REVEAL_TOKEN_CAP } from './constants.js';

export class GameState {
  constructor(width = 20, height = 15) {
    this.width = width;
    this.height = height;

    this.players = {
      [PLAYERS.A]: { x: 0, y: 0 },
      [PLAYERS.B]: { x: 0, y: 0 },
    };

    this.grid = {
      width,
      height,
      cells: this._createEmptyGrid(width, height),
    };

    this.playerRules = {
      [PLAYERS.A]: {},
      [PLAYERS.B]: {},
    };

    this.revealTokens = {
      [PLAYERS.A]: 3,
      [PLAYERS.B]: 3,
    };

    // 每步计数：用于令牌重生（每 N 步自动获得 1 个揭示令牌）
    this.playerStepCounts = {
      [PLAYERS.A]: 0,
      [PLAYERS.B]: 0,
    };

    this.revealedRules = [];

    this.playerPositions = null;

    // 每位玩家的访问路径（仅保留最近3步的记忆）
    this.playerPath = {
      [PLAYERS.A]: [],
      [PLAYERS.B]: [],
    };
  }

  _createEmptyGrid(w, h) {
    const cells = [];
    for (let y = 0; y < h; y++) {
      cells[y] = [];
      for (let x = 0; x < w; x++) {
        cells[y][x] = {
          terrain: 'floor',
          entities: [],
          revealedTo: [],
          rules: [],
        };
      }
    }
    return cells;
  }

  getPlayerPosition(player) {
    if (this.playerPositions && this.playerPositions[player]) {
      return this.playerPositions[player];
    }
    return this.players[player] || null;
  }

  isRevealedTo(player, x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const cell = this.grid.cells[y][x];
    return cell.revealedTo && cell.revealedTo.includes(player);
  }

  revealTo(player, x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const cell = this.grid.cells[y][x];
    if (!cell.revealedTo) cell.revealedTo = [];
    if (!cell.revealedTo.includes(player)) {
      cell.revealedTo.push(player);
    }
  }

  recordVisit(player, x, y) {
    this.playerPath[player].push({ x, y });
    // 只保留最近3步
    while (this.playerPath[player].length > 3) {
      this.playerPath[player].shift();
    }
  }

  recomputeVisibility(player) {
    // 收集旗帜位置——旗帜不受 3 步记忆遗忘影响，始终对双方可见
    const flagCells = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid.cells[y][x];
        if (cell.revealedTo) {
          cell.revealedTo = cell.revealedTo.filter(p => p !== player);
        }
        // 记住旗帜格，后面统一恢复可见
        if (cell.entities && cell.entities.some(e => e.type === 'flag')) {
          flagCells.push({ x, y });
        }
      }
    }
    // 从最近3步的位置重新揭示十字区域
    for (const pos of this.playerPath[player]) {
      this.revealTo(player, pos.x, pos.y);
      const adjacents = [[pos.x, pos.y - 1], [pos.x, pos.y + 1], [pos.x - 1, pos.y], [pos.x + 1, pos.y]];
      for (const [ax, ay] of adjacents) {
        if (ax >= 0 && ax < this.width && ay >= 0 && ay < this.height) {
          this.revealTo(player, ax, ay);
        }
      }
    }
    // 旗帜始终可见
    for (const { x, y } of flagCells) {
      this.revealTo(player, x, y);
    }
  }

  getVisibleEntities(player, x, y) {
    if (!this.isRevealedTo(player, x, y)) return [];
    const cell = this.grid.cells[y][x];
    return cell.entities || [];
  }

  setPlayerRules(player, rules) {
    this.playerRules[player] = { ...rules };
  }

  getEntityProperty(player, entityType) {
    const rules = this.playerRules[player];
    return rules[entityType] || PROPERTIES.NONE;
  }

  hasRevealToken(player) {
    return this.revealTokens[player] > 0;
  }

  consumeRevealToken(player) {
    if (this.revealTokens[player] > 0) {
      this.revealTokens[player]--;
      return true;
    }
    return false;
  }

  /**
   * 增加揭示令牌（上限 REVEAL_TOKEN_CAP）
   * @returns {boolean} 是否成功增加（未达到上限）
   */
  addRevealToken(player) {
    if (this.revealTokens[player] >= REVEAL_TOKEN_CAP) {
      return false; // 已达上限
    }
    this.revealTokens[player]++;
    return true;
  }

  /**
   * 记录玩家一步行动，并在达到间隔时自动奖励揭示令牌
   * @returns {{ earned: boolean, total: number }} 是否获得新令牌及当前总数
   */
  stepAndCheckTokenReward(player) {
    this.playerStepCounts[player]++;
    const count = this.playerStepCounts[player];
    if (count > 0 && count % REVEAL_TOKEN_INTERVAL === 0) {
      const earned = this.addRevealToken(player);
      return { earned, total: this.revealTokens[player], step: count };
    }
    return { earned: false, total: this.revealTokens[player], step: count };
  }

  revealRule(player, x, y) {
    const cell = this.grid.cells[y][x];
    if (!cell || !cell.rules || cell.rules.length === 0) return null;

    const existing = this.revealedRules.find(r => r.x === x && r.y === y);
    if (existing) return existing.rule;

    const rule = cell.rules[0];
    this.revealedRules.push({
      player,
      x,
      y,
      rule: { ...rule },
      timestamp: Date.now(),
    });
    return rule;
  }

  isRuleRevealed(x, y) {
    return this.revealedRules.some(r => r.x === x && r.y === y);
  }

  getRevealedRule(x, y) {
    return this.revealedRules.find(r => r.x === x && r.y === y);
  }

  clone() {
    const copy = new GameState(this.width, this.height);
    copy.players = {
      [PLAYERS.A]: { ...this.players[PLAYERS.A] },
      [PLAYERS.B]: { ...this.players[PLAYERS.B] },
    };
    copy.grid.cells = this.grid.cells.map(row =>
      row.map(cell => ({
        terrain: cell.terrain,
        entities: [...(cell.entities || [])],
        revealedTo: [...(cell.revealedTo || [])],
        rules: [...(cell.rules || [])],
      }))
    );
    copy.playerRules = {
      [PLAYERS.A]: { ...this.playerRules[PLAYERS.A] },
      [PLAYERS.B]: { ...this.playerRules[PLAYERS.B] },
    };
    copy.revealTokens = { ...this.revealTokens };
    copy.playerStepCounts = { ...this.playerStepCounts };
    copy.revealedRules = [...this.revealedRules];
    copy.playerPath = {
      [PLAYERS.A]: this.playerPath[PLAYERS.A].map(p => ({ ...p })),
      [PLAYERS.B]: this.playerPath[PLAYERS.B].map(p => ({ ...p })),
    };
    return copy;
  }
}