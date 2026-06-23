import { PLAYERS } from '../game/constants.js';

export class RevealSystem {
  constructor(gameState) {
    this.state = gameState;
  }

  reveal(player, x, y) {
    const changed = [];
    this.state.revealTo(player, x, y);
    changed.push(`${x},${y}`);

    const adjacents = [
      [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
    ];
    for (const [ax, ay] of adjacents) {
      if (ax >= 0 && ax < this.state.width &&
          ay >= 0 && ay < this.state.height) {
        this.state.revealTo(player, ax, ay);
        changed.push(`${ax},${ay}`);
      }
    }

    return changed;
  }

  revealRule(player, x, y) {
    if (!this.state.hasRevealToken(player)) {
      return { success: false, message: '没有揭示令牌了' };
    }

    const cell = this.state.grid.cells[y][x];
    if (!cell || !cell.rules || cell.rules.length === 0) {
      return { success: false, message: '这个位置没有规则' };
    }

    if (this.state.isRuleRevealed(x, y)) {
      return { success: false, message: '这条规则已经被揭示过了' };
    }

    this.state.consumeRevealToken(player);
    const rule = this.state.revealRule(player, x, y);

    // 关键：揭示的规则立即对双方生效（共识机制）
    const entityKey = rule.entity.toLowerCase();
    const propertyKey = rule.property.toLowerCase();
    for (const p of [PLAYERS.A, PLAYERS.B]) {
      this.state.playerRules[p][entityKey] = propertyKey;
    }

    return {
      success: true,
      message: `${player === PLAYERS.A ? '玩家A' : '玩家B'}揭示了规则: ${rule.entity} IS ${rule.property}`,
      rule,
      x,
      y,
    };
  }

  /**
   * 清除暗雾：消耗 1 个揭示令牌，清除指定格子的暗雾覆盖
   */
  clearDarkFog(player, x, y) {
    if (!this.state.hasRevealToken(player)) {
      return { success: false, message: '没有揭示令牌，无法清除暗雾' };
    }

    if (!this.state.hasDarkFog(x, y)) {
      return { success: false, message: '该位置没有暗雾' };
    }

    this.state.consumeRevealToken(player);
    this.state.clearDarkFog(x, y);

    return {
      success: true,
      message: `${player === PLAYERS.A ? '玩家A' : '玩家B'}清除了 (${x},${y}) 的暗雾！`,
      x,
      y,
    };
  }

  getRevealedEntities(x, y, player) {
    const cell = this.state.grid.cells[y][x];
    if (!cell) return [];
    const entities = cell.entities || [];
    return entities.map(e => ({
      type: e.type,
      player: e.player || null,
      name: e.name || null,
    }));
  }

  getRevealedCells(player) {
    const revealed = [];
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        if (this.state.isRevealedTo(player, x, y)) {
          revealed.push({ x, y });
        }
      }
    }
    return revealed;
  }

  getAllRevealedRules() {
    return [...this.state.revealedRules];
  }

  getRevealTokenCount(player) {
    return this.state.revealTokens[player];
  }
}