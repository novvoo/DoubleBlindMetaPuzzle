import { PLAYERS, PROPERTIES } from './constants.js';

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
    // 先清空该玩家所有的 revealedTo
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid.cells[y][x];
        if (cell.revealedTo) {
          cell.revealedTo = cell.revealedTo.filter(p => p !== player);
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
    copy.revealedRules = [...this.revealedRules];
    copy.playerPath = {
      [PLAYERS.A]: this.playerPath[PLAYERS.A].map(p => ({ ...p })),
      [PLAYERS.B]: this.playerPath[PLAYERS.B].map(p => ({ ...p })),
    };
    return copy;
  }
}