import { PLAYERS } from '../game/constants.js';

export class BoardRenderer {
  constructor(gameState, perspective = null) {
    this.state = gameState;
    this.perspective = perspective; // PLAYERS.A, PLAYERS.B, or null (show both)
    this.grid = null;
    this.labelEl = null;
    this.siblingRenderer = null;  // 兄弟棋盘引用，用于跨棋盘联动
  }

  /** 关联兄弟棋盘，实现悬停联动 */
  linkSibling(sibling) {
    this.siblingRenderer = sibling;
  }

  createGrid(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    this.grid = document.createElement('div');
    this.grid.className = 'board-grid';
    this.grid.style.gridTemplateColumns = `repeat(${this.state.width}, 1fr)`;
    this.grid.style.gridTemplateRows = `repeat(${this.state.height}, 1fr)`;
    container.appendChild(this.grid);

    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        // 悬停联动：同一坐标在兄弟棋盘上高亮
        cell.addEventListener('mouseenter', () => {
          this._highlightCross(x, y);
        });
        cell.addEventListener('mouseleave', () => {
          this._clearCrossHighlight();
        });

        this.grid.appendChild(cell);
      }
    }
  }

  /** 在兄弟棋盘上高亮同一坐标 */
  _highlightCross(x, y) {
    if (!this.siblingRenderer || !this.siblingRenderer.grid) return;
    const cells = this.siblingRenderer.grid.children;
    const idx = y * this.state.width + x;
    if (cells[idx]) {
      cells[idx].classList.add('cross-highlight');
    }
  }

  /** 清除兄弟棋盘上的高亮 */
  _clearCrossHighlight() {
    if (!this.siblingRenderer || !this.siblingRenderer.grid) return;
    const cells = this.siblingRenderer.grid.children;
    for (const cell of cells) {
      cell.classList.remove('cross-highlight');
    }
  }

  render() {
    const cells = this.grid.children;
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const cell = cells[y * this.state.width + x];
        this.renderCell(cell, x, y);
      }
    }
  }

  renderCell(cell, x, y) {
    // 交叉可视：检测对方/自己是否在此格
    let opponent = null;
    let opponentHere = false;
    let selfHere = false;
    if (this.perspective) {
      opponent = this.perspective === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
      const oppPos = this.state.getPlayerPosition(opponent);
      opponentHere = oppPos && oppPos.x === x && oppPos.y === y;
      const selfPos = this.state.getPlayerPosition(this.perspective);
      selfHere = selfPos && selfPos.x === x && selfPos.y === y;
    }

    const cellObj = this.state.grid.cells[y][x];
    const isWall = cellObj.terrain === 'wall';

    // Use perspective if set, otherwise show combined view
    let isVisible;
    if (this.perspective === PLAYERS.A) {
      isVisible = this.state.isRevealedTo(PLAYERS.A, x, y);
    } else if (this.perspective === PLAYERS.B) {
      isVisible = this.state.isRevealedTo(PLAYERS.B, x, y);
    } else {
      isVisible = this.state.isRevealedTo(PLAYERS.A, x, y)
               || this.state.isRevealedTo(PLAYERS.B, x, y);
    }

    // 墙壁始终显示（即使未揭示），但实体仍受迷雾控制
    if (!isVisible && isWall) {
      cell.className = 'cell fog wall-static';
      let html = '<span class="terrain-icon terrain-icon-muted">🧱</span>';
      // 墙上若对方在此，显示低透明度鬼影
      if (opponentHere) {
        const ghostIcon = opponent === PLAYERS.B ? '🅱' : '🅰';
        const ghostClass = opponent === PLAYERS.B ? 'ghost-b-icon' : 'ghost-a-icon';
        html += `<span class="${ghostClass}">${ghostIcon}</span>`;
        cell.classList.add('has-ghost');
      }
      cell.innerHTML = html;
      cell.title = '墙壁（未探索）';
      return;
    }

    if (!isVisible) {
      cell.className = 'cell fog';
      cell.innerHTML = '';
      // 迷雾格：若对方在此，显示低透明度鬼影
      if (opponentHere) {
        const ghostIcon = opponent === PLAYERS.B ? '🅱' : '🅰';
        const ghostClass = opponent === PLAYERS.B ? 'ghost-b-icon' : 'ghost-a-icon';
        cell.innerHTML = `<span class="${ghostClass}">${ghostIcon}</span>`;
        cell.classList.add('has-ghost');
        cell.title = opponent === PLAYERS.B ? '玩家B 在此' : '玩家A 在此';
      } else {
        cell.title = '迷雾';
      }
      return;
    }

    const entities = cellObj.entities || [];
    const hasDarkFog = this.state.hasDarkFog(x, y);

    // 暗雾覆盖：即使已揭示，实体也被暗雾隐藏
    if (hasDarkFog) {
      cell.className = 'cell revealed dark-fog';
      if (isWall) {
        cell.classList.add('wall');
      }
      let fogHtml = '<span class="terrain-icon terrain-icon-muted">🌫️</span>';
      // 暗雾中若对方在此，显示鬼影
      if (opponentHere) {
        const ghostIcon = opponent === PLAYERS.B ? '🅱' : '🅰';
        const ghostClass = opponent === PLAYERS.B ? 'ghost-b-icon' : 'ghost-a-icon';
        fogHtml += `<span class="${ghostClass}">${ghostIcon}</span>`;
        cell.classList.add('has-ghost');
      }
      cell.innerHTML = fogHtml;
      cell.title = `暗雾区域 - 阻挡移动 (按 Q/U 消耗1令牌清除)`;
      return;
    }

    cell.className = 'cell revealed';

    if (isWall) {
      cell.classList.add('wall');
    } else {
      cell.classList.add('floor');
    }

    // 双方同格 → 缩小比例共用方格
    if (selfHere && opponentHere) {
      cell.classList.add('both-players');
    }

    // Add perspective border class
    if (this.perspective === PLAYERS.A) {
      cell.classList.add('visible-A');
    } else if (this.perspective === PLAYERS.B) {
      cell.classList.add('visible-B');
    } else {
      const visibleA = this.state.isRevealedTo(PLAYERS.A, x, y);
      const visibleB = this.state.isRevealedTo(PLAYERS.B, x, y);
      if (visibleA && !visibleB) {
        cell.classList.add('visible-A');
      } else if (visibleB && !visibleA) {
        cell.classList.add('visible-B');
      } else {
        cell.classList.add('visible-both');
      }
    }

    const hasRule = cellObj.rules && cellObj.rules.length > 0;
    const isRevealedRule = this.state.isRuleRevealed(x, y);

    if (hasRule) {
      if (isRevealedRule) {
        cell.classList.add('rule-revealed');
      } else {
        cell.classList.add('rule-hidden');
      }
    }

    const entityNames = {
      player_a: '玩家A',
      player_b: '玩家B',
      baba: '巴巴',
      keke: '凯凯',
      flag: '旗帜',
      treasure: '宝箱',
      obstacle: '障碍物',
      exit: '出口',
      rule_block: '规则方块',
    };

    let tooltipParts = [];
    if (cellObj.terrain) {
      tooltipParts.push(isWall ? '墙壁' : '地板');
    }

    // 去重：同一格不留两个 A 或两个 B
    const seenTypes = new Set();
    const uniqueEntities = [];
    for (const e of entities) {
      const typeKey = e.type;
      if (!seenTypes.has(typeKey)) {
        seenTypes.add(typeKey);
        uniqueEntities.push(e);
      }
    }

    for (const e of uniqueEntities) {
      const name = e.name || entityNames[e.type] || e.type || '未知';
      const playerSuffix = e.player ? ` (${e.player})` : '';
      tooltipParts.push(name + playerSuffix);
    }
    if (hasRule) {
      if (isRevealedRule) {
        const rule = this.state.getRevealedRule(x, y);
        tooltipParts.push(`规则: ${rule.rule.entity} IS ${rule.rule.property}`);
      } else {
        tooltipParts.push('隐藏规则 (按 Q/U 揭示)');
      }
    }
    cell.title = tooltipParts.join(', ');

    let html = '';

    if (isWall) {
      html += '<span class="terrain-icon">🧱</span>';
    }

    for (const entity of uniqueEntities) {
      const icon = entity.icon
        || ({ player_a: '🅰', player_b: '🅱', baba: '🐑', keke: '🐱', flag: '🚩', treasure: '💎', obstacle: '🪨', exit: '🚪', rule_block: '📜' }[entity.type])
        || '?';
      const entityClass = entity.type === 'player_a' ? 'player-a-icon' :
                          entity.type === 'player_b' ? 'player-b-icon' : 'entity-icon';
      html += `<span class="${entityClass}">${icon}</span>`;
    }

    // 已揭示格中，若对方在此但实体列表没包含对方 → 补鬼影（防御性去重）
    if (opponentHere && !uniqueEntities.some(e => e.type === `player_${opponent.toLowerCase()}`)) {
      const ghostIcon = opponent === PLAYERS.B ? '🅱' : '🅰';
      const ghostClass = opponent === PLAYERS.B ? 'ghost-b-icon' : 'ghost-a-icon';
      html += `<span class="${ghostClass}">${ghostIcon}</span>`;
    }

    if (hasRule) {
      if (isRevealedRule) {
        const rule = this.state.getRevealedRule(x, y);
        html += `<span class="rule-text">${rule.rule.entity} IS ${rule.rule.property}</span>`;
      } else if (this.perspective) {
        // Show ? for unrevealed rules if viewing from a specific perspective
        html += '<span class="rule-placeholder">?</span>';
      }
    }

    cell.innerHTML = html;
  }

  highlightReachable(reachableSet) {
    const cells = this.grid.children;
    for (let y = 0; y < this.state.height; y++) {
      for (let x = 0; x < this.state.width; x++) {
        const cell = cells[y * this.state.width + x];
        cell.classList.remove('reachable');
      }
    }
    for (const key of reachableSet) {
      const [x, y] = key.split(',').map(Number);
      const cell = cells[y * this.state.width + x];
      if (cell) cell.classList.add('reachable');
    }
  }
}