import { PLAYERS, DIRECTIONS, DARK_FOG_INTERVAL, DARK_FOG_MAX, DARK_FOG_PATCH_SIZE } from '../game/constants.js';
import { GameState } from '../game/GameState.js';
import { GameEngine } from '../game/GameEngine.js';
import { getLevel, getLevelCount } from '../game/Levels.js';
import { BoardRenderer } from './BoardRenderer.js';
import { RevealSystem } from './RevealSystem.js';
import { MessageLog } from './MessageLog.js';
import { InputHandler } from './InputHandler.js';
import { AIController } from '../ai/AIController.js';

const PLAYER_NAMES = { [PLAYERS.A]: '玩家A', [PLAYERS.B]: '玩家B' };
const DIR_NAMES = {
  [DIRECTIONS.UP]: '上',
  [DIRECTIONS.DOWN]: '下',
  [DIRECTIONS.LEFT]: '左',
  [DIRECTIONS.RIGHT]: '右',
};

export class Game {
  constructor() {
    this.state = null;
    this.engine = null;
    this.rendererA = null;
    this.rendererB = null;
    this.reveal = null;
    this.log = null;
    this.input = null;
    this.ai = null;

    this.currentLevel = 1;
    this.turn = PLAYERS.A;
    this.winner = null;
    this.movesThisTurn = 0;
    this.maxMovesPerTurn = 1;
    this.history = [];
    this.started = false;

    // AI 自动模式
    this.autoPlay = false;
    this.autoPlaySpeed = 400; // ms between moves
    this.autoPlayTimer = null;
    this._lastFailedDir = null;

    // AI 模式下旗帜位置变化计数器
    this._aiFlagMoveCounter = 0;
    this._flagMoveInterval = 10;

    // 暗雾生成计数器（全局步数）
    this._globalStepCount = 0;
  }

  start() {
    this.state = new GameState(20, 15);
    this.engine = new GameEngine(this.state);
    this.rendererA = new BoardRenderer(this.state, PLAYERS.A);
    this.rendererB = new BoardRenderer(this.state, PLAYERS.B);
    this.reveal = new RevealSystem(this.state);
    this.log = new MessageLog('message-log');
    this.input = new InputHandler();

    this.input.setCallbacks({
      onDirection: (player, direction) => this._handleDirection(player, direction),
      onReveal: (player) => this._handleReveal(player),
      onWait: (player) => this._handleWait(player),
      onUndo: () => this._handleUndo(),
    });

    this.input.bind();

    this._setupLevelSelect();
    this._setupButtons();
    this._loadLevel(this.currentLevel);
    this._initialReveal();
    this.rendererA.createGrid('board-a');
    this.rendererB.createGrid('board-b');

    // 关联两个棋盘：同一坐标悬停联动高亮
    this.rendererA.linkSibling(this.rendererB);
    this.rendererB.linkSibling(this.rendererA);

    this.rendererA.render();
    this.rendererB.render();
    this._updateHUD();
    this.started = true;

    this.log.add('🎮 欢迎来到【双盲元谜题 · 推块谜题】 — 同一棋盘，两套规则认知', 'system');
    this.log.add('💡 鼠标悬停棋盘 -> 另一棋盘同坐标高亮联动', 'system');
    this.log.add('🚩 AI 模式下，旗帜每5步更换位置！', 'system');
  }

  // ===== AI 自动对战 =====

  startAutoPlay(speed = 400) {
    this.autoPlaySpeed = speed;
    this.autoPlay = true;
    this.ai = new AIController(this);
    this.log.add(`⚡ AI 自动对战开始！速度: ${speed}ms/步`, 'system');
    this._scheduleAIStep();
  }

  stopAutoPlay() {
    this.autoPlay = false;
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.log.add('⏸ AI 自动模式已暂停', 'system');
  }

  setSpeed(speed) {
    this.autoPlaySpeed = speed;
    this.log.add(`⚡ 速度调整为: ${speed}ms/步`, 'system');
  }

  toggleAutoPlay() {
    if (this.autoPlay) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay(this.autoPlaySpeed);
    }
  }

  _scheduleAIStep() {
    if (!this.autoPlay || this.winner) return;

    this.autoPlayTimer = setTimeout(() => {
      this._aiStep();
    }, this.autoPlaySpeed);
  }

  _aiStep() {
    if (!this.autoPlay || this.winner) return;

    const currentPlayer = this.turn;
    const decision = this.ai.decide(currentPlayer, this._lastFailedDir);

    let actionTaken = false;
    switch (decision.action) {
      case 'move': {
        const moveResult = this._tryAIMove(currentPlayer, decision.direction);
        if (!moveResult) {
          this._lastFailedDir = decision.direction;
          this._scheduleAIStep();
          return;
        }
        this._lastFailedDir = null;
        actionTaken = true;
        break;
      }
      case 'reveal':
        this._handleReveal(currentPlayer);
        this._lastFailedDir = null;
        actionTaken = true;
        break;
      case 'wait':
      default:
        this._handleWait(currentPlayer);
        this._lastFailedDir = null;
        actionTaken = true;
        break;
    }

    // 如果赢了，停止自动对战，等待用户手动操作
    if (this.winner) {
      this.log.add('🤖 AI 通关！', 'win');
      this.stopAutoPlay();
      return;
    }

    // AI 每执行 N 步，旗帜随机更换位置
    if (actionTaken) {
      this._aiFlagMoveCounter++;
      if (this._aiFlagMoveCounter >= this._flagMoveInterval) {
        this._aiFlagMoveCounter = 0;
        this._relocateFlag();
      }
    }

    this._scheduleAIStep();
  }

  /**
   * 尝试执行 AI 移动，返回是否成功
   */
  _tryAIMove(player, direction) {
    if (this.winner) return false;
    if (player !== this.turn) return false;

    this._saveState();
    const result = this.engine.movePlayer(player, direction);

    if (!result.success) {
      this._undoState();
      return false;
    }

    if (this.state.playerPositions) {
      this.state.players[player] = {
        ...this.state.playerPositions[player],
      };
    }

    this._revealAround(player);

    for (const evt of result.events) {
      switch (evt.type) {
        case 'move':
          this.log.add(
            `${PLAYER_NAMES[player]} 向${DIR_NAMES[direction]}移动 ` +
            `(${evt.from.x},${evt.from.y}) → (${evt.to.x},${evt.to.y})`,
            'system'
          );
          break;
        case 'fog_cost':
          this.log.add(
            `🌫️ ${PLAYER_NAMES[player]} 踏入暗雾！消耗 1 令牌 (剩余: ${evt.remaining})`,
            'warning'
          );
          break;
        case 'flag_cost':
          this.log.add(
            `🚩 ${PLAYER_NAMES[player]} 揭示旗帜！消耗 1 令牌 (剩余: ${evt.remaining})`,
            'reveal'
          );
          break;
        case 'win':
          this.winner = player;
          this.log.add(`🏆 ${PLAYER_NAMES[player]} 获胜！`, 'win');
          this._showWinToast();
          break;
      }
    }

    this.rendererA.render();
    this.rendererB.render();
    this._updateHUD();

    if (!this.winner) {
      this._advanceTurn(player);
    }

    return true;
  }

  /**
   * AI 模式下将旗帜随机移动到棋盘上的一个空地板格
   */
  _relocateFlag() {
    const state = this.state;
    // 找到当前旗帜位置并移除
    let flagRemoved = false;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid.cells[y][x];
        const entities = cell.entities || [];
        const flagIdx = entities.findIndex(e => e.type === 'flag');
        if (flagIdx !== -1) {
          entities.splice(flagIdx, 1);
          flagRemoved = true;
          break;
        }
      }
      if (flagRemoved) break;
    }

    // 找所有可选空地板格（非墙、无实体、非玩家及其可见十字区域）
    const posA = state.getPlayerPosition(PLAYERS.A);
    const posB = state.getPlayerPosition(PLAYERS.B);
    const candidates = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid.cells[y][x];
        if (cell.terrain === 'wall') continue;
        // 不能放在玩家脚下
        if ((posA && posA.x === x && posA.y === y) ||
            (posB && posB.x === x && posB.y === y)) continue;
        // 不能放在 AB 的可见十字区域（曼哈顿距离≤1）
        if (posA && Math.abs(x - posA.x) + Math.abs(y - posA.y) <= 1) continue;
        if (posB && Math.abs(x - posB.x) + Math.abs(y - posB.y) <= 1) continue;
        // 不能放在有实体的格子上
        if (cell.entities && cell.entities.length > 0) continue;
        candidates.push({ x, y });
      }
    }

    if (candidates.length === 0) {
      this.log.add('⚠️ 没有空位放置旗帜', 'warning');
      return;
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const targetCell = state.grid.cells[target.y][target.x];
    if (!targetCell.entities) targetCell.entities = [];
    targetCell.entities.push({ type: 'flag', name: '旗帜', icon: '🚩' });

    // 揭示新位置给双方
    state.revealTo(PLAYERS.A, target.x, target.y);
    state.revealTo(PLAYERS.B, target.x, target.y);

    this.rendererA.render();
    this.rendererB.render();
    this.log.add(`🚩 旗帜移动到 (${target.x}, ${target.y})`, 'system');

    // 旗帜移动后，迷雾也跟着重新围绕新旗帜位置生成
    this._spawnDarkFog();
    this.rendererA.render();
    this.rendererB.render();
  }

  /**
   * 围绕旗帜生成暗雾区域 — 迷雾跟随旗帜变动
   * 有令牌时可以穿行暗雾（消耗令牌并清除），无令牌时阻挡
   *
   * 策略：
   * 1. 找到棋盘上所有旗帜位置
   * 2. 以旗帜相邻格为种子，BFS 向外扩散形成环绕迷雾
   * 3. 旗帜格本身不覆盖迷雾（保证可见）
   * 4. 每次调用先清除全部旧迷雾，重新围绕旗帜生成
   */
  _spawnDarkFog() {
    const state = this.state;

    // 找到所有旗帜位置
    const flagPositions = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid.cells[y][x];
        if (cell.entities && cell.entities.some(e => e.type === 'flag')) {
          flagPositions.push({ x, y });
        }
      }
    }
    if (flagPositions.length === 0) return;

    const posA = state.getPlayerPosition(PLAYERS.A);
    const posB = state.getPlayerPosition(PLAYERS.B);

    // 清除全部旧迷雾（准备围绕旗帜重新生成）
    state.darkFogCells.clear();

    // 判断是否可作为迷雾候选
    const isFogCandidate = (x, y) => {
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
      const cell = state.grid.cells[y][x];
      if (cell.terrain === 'wall') return false;
      // 旗帜格本身不覆盖迷雾
      for (const f of flagPositions) {
        if (f.x === x && f.y === y) return false;
      }
      if (state.hasDarkFog(x, y)) return false;
      if (cell.entities && cell.entities.length > 0) return false;
      if ((posA && posA.x === x && posA.y === y) ||
          (posB && posB.x === x && posB.y === y)) return false;
      return true;
    };

    const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const allPatchCells = [];
    const globalVisited = new Set();

    // 每个旗帜周围分配等量迷雾格子
    const perFlagTarget = Math.floor(DARK_FOG_PATCH_SIZE / flagPositions.length);

    for (const flag of flagPositions) {
      // 种子：旗帜的四个相邻格
      const seeds = [];
      for (const [dx, dy] of DIRS) {
        const nx = flag.x + dx;
        const ny = flag.y + dy;
        if (isFogCandidate(nx, ny)) {
          seeds.push({ x: nx, y: ny });
        }
      }
      if (seeds.length === 0) continue;

      const patchCells = [];
      const visited = new Set();
      const queue = [...seeds.sort(() => Math.random() - 0.5)];
      for (const s of queue) {
        visited.add(`${s.x},${s.y}`);
        globalVisited.add(`${s.x},${s.y}`);
      }

      const flagLimit = Math.min(perFlagTarget, DARK_FOG_MAX - allPatchCells.length);

      while (queue.length > 0 && patchCells.length < flagLimit) {
        const idx = Math.floor(Math.random() * queue.length);
        const cur = queue.splice(idx, 1)[0];
        patchCells.push(cur);

        const shuffled = DIRS.sort(() => Math.random() - 0.5);
        for (const [dx, dy] of shuffled) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          const key = `${nx},${ny}`;
          if (visited.has(key) || globalVisited.has(key)) continue;
          visited.add(key);
          globalVisited.add(key);
          if (isFogCandidate(nx, ny)) {
            queue.push({ x: nx, y: ny });
          }
        }
      }

      for (const c of patchCells) {
        allPatchCells.push(c);
      }
    }

    for (const cell of allPatchCells) {
      state.addDarkFog(cell.x, cell.y);
    }

    if (allPatchCells.length > 0) {
      this.log.add(
        `🌫️ 暗雾围绕 ${flagPositions.length} 面旗帜生成：${allPatchCells.length} 格`,
        'system'
      );
    }
  }

  _setupLevelSelect() {
    const select = document.getElementById('level-select');
    const count = getLevelCount();
    for (let i = 1; i <= count; i++) {
      const level = getLevel(i);
      const option = document.createElement('option');
      option.value = i;
      option.textContent = level.name;
      select.appendChild(option);
    }
    // 只有一关时隐藏关卡选择
    if (count <= 1) {
      select.style.display = 'none';
    }
    select.addEventListener('change', (e) => {
      const levelId = parseInt(e.target.value);
      if (levelId) {
        this.loadLevel(levelId);
      }
    });
  }

  _setupButtons() {
    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
    const btnClearLog = document.getElementById('btn-clear-log');
    if (btnClearLog) btnClearLog.addEventListener('click', () => this.log.clear());
    // 单关卡模式，隐藏"下一关"按钮
    const btnNextCtrl = document.getElementById('btn-next-level-ctrl');
    if (btnNextCtrl) btnNextCtrl.style.display = 'none';
  }

  _loadLevel(levelId) {
    const level = getLevel(levelId);
    if (!level) {
      this.log.add('🎉 你已完成所有关卡！', 'win');
      this.winner = 'done';
      return;
    }

    this.currentLevel = levelId;
    this.state.width = level.width;
    this.state.height = level.height;
    this.state.grid.cells = JSON.parse(JSON.stringify(level.cells));

    // ===== 随机化：消除硬编码偏向 =====
    // 随机交换 A/B 的规则集和起始位置
    const swapAB = Math.random() < 0.5;
    const rulesForA = swapAB ? level.rulesB : level.rulesA;
    const rulesForB = swapAB ? level.rulesA : level.rulesB;
    const startForA = swapAB ? { ...level.startB } : { ...level.startA };
    const startForB = swapAB ? { ...level.startA } : { ...level.startB };

    if (swapAB && this.started) {
      this.log.add('🎲 本轮随机交换了 A/B 的规则和起始位置', 'system');
    }

    this.state.players[PLAYERS.A] = startForA;
    this.state.players[PLAYERS.B] = startForB;

    this.state.setPlayerRules(PLAYERS.A, rulesForA);
    this.state.setPlayerRules(PLAYERS.B, rulesForB);

    this.state.revealTokens = { [PLAYERS.A]: 3, [PLAYERS.B]: 3 };
    this.state.playerStepCounts = { [PLAYERS.A]: 0, [PLAYERS.B]: 0 };
    this.state.revealedRules = [];
    this.state.darkFogCells = new Set();
    this.state.playerPath = { [PLAYERS.A]: [], [PLAYERS.B]: [] };
    this._globalStepCount = 0;

    this._placePlayerEntity(PLAYERS.A, startForA.x, startForA.y);
    this._placePlayerEntity(PLAYERS.B, startForB.x, startForB.y);

    // 随机决定谁先手
    this.turn = Math.random() < 0.5 ? PLAYERS.A : PLAYERS.B;
    this.movesThisTurn = 0;
    this.winner = null;
    this.history = [];

    document.getElementById('level-name').textContent = level.name;
    document.getElementById('level-desc').textContent = level.description;

    this._updateConsensusPanel();

    this.log.add(`🎮 双盲元谜题 · ${level.name}`, 'system');
    if (this.autoPlay) this.log.add('🚩 旗帜每5步随机更换位置', 'system');
    this.log.add(`🎲 先手: ${PLAYER_NAMES[this.turn]}`, 'system');
  }

  /** 更新共识面板：展示双方已揭示的规则 */
  _updateConsensusPanel() {
    const container = document.getElementById('consensus-entries');
    if (!container) return;

    const revealed = this.reveal.getAllRevealedRules();

    if (revealed.length === 0) {
      container.innerHTML = '<div class="consensus-empty">尚未揭示任何规则</div>';
      return;
    }

    let html = '';
    for (const r of revealed) {
      const who = r.player === PLAYERS.A ? '🔴 A' : '🔵 B';
      html += `<div class="consensus-entry">
        <span class="entry-player">${who} 揭示 · (${r.x},${r.y})</span><br>
        <span class="entry-rule">${r.rule.entity} IS ${r.rule.property}</span>
      </div>`;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  _placePlayerEntity(player, x, y) {
    const cell = this.state.grid.cells[y][x];
    if (!cell.entities) cell.entities = [];
    // 去重：同一格不留两个同类玩家实体
    cell.entities = cell.entities.filter(
      e => e.type !== `player_${player.toLowerCase()}`
    );
    cell.entities.push({
      type: `player_${player.toLowerCase()}`,
      player,
      name: PLAYER_NAMES[player],
      icon: player === PLAYERS.A ? '🅰' : '🅱',
    });
  }

  _initialReveal() {
    for (const p of [PLAYERS.A, PLAYERS.B]) {
      const pos = this.state.players[p];
      this.state.recordVisit(p, pos.x, pos.y);
      this.state.recomputeVisibility(p);
    }
  }

  _revealAround(player) {
    const pos = this.state.players[player];
    this.state.recordVisit(player, pos.x, pos.y);
    this.state.recomputeVisibility(player);
  }

  _handleDirection(player, direction) {
    if (this.winner) return;
    if (this.autoPlay) return; // AI 模式下禁用手动操作
    if (player !== this.turn) {
      this.log.add(`现在不是 ${PLAYER_NAMES[player]} 的回合`, 'warning');
      return;
    }

    this._saveState();
    const result = this.engine.movePlayer(player, direction);

    if (!result.success) {
      this.log.add(result.message, 'warning');
      this._undoState();
      return;
    }

    if (this.state.playerPositions) {
      this.state.players[player] = {
        ...this.state.playerPositions[player],
      };
    }

    this._revealAround(player);

    for (const evt of result.events) {
      switch (evt.type) {
        case 'move':
          this.log.add(
            `${PLAYER_NAMES[player]} 向${DIR_NAMES[direction]}移动 ` +
            `(${evt.from.x},${evt.from.y}) → (${evt.to.x},${evt.to.y})`,
            'system'
          );
          break;
        case 'fog_cost':
          this.log.add(
            `🌫️ ${PLAYER_NAMES[player]} 踏入暗雾！消耗 1 令牌 (剩余: ${evt.remaining})`,
            'warning'
          );
          break;
        case 'flag_cost':
          this.log.add(
            `🚩 ${PLAYER_NAMES[player]} 揭示旗帜！消耗 1 令牌 (剩余: ${evt.remaining})`,
            'reveal'
          );
          break;
        case 'win':
          this.winner = player;
          this.log.add(`🏆 ${PLAYER_NAMES[player]} 获胜！`, 'win');
          this._showWinToast();
          break;
      }
    }

    this.rendererA.render();
    this.rendererB.render();
    this._updateHUD();

    if (!this.winner) {
      this._advanceTurn(player);
    }
  }

  _handleReveal(player) {
    if (this.winner) return;

    const pos = this.state.players[player];

    // 优先级 1：清除暗雾（消耗令牌）
    if (this.state.hasDarkFog(pos.x, pos.y)) {
      const fogResult = this.reveal.clearDarkFog(player, pos.x, pos.y);
      if (fogResult.success) {
        this.log.add(fogResult.message, 'reveal');
        this.rendererA.render();
        this.rendererB.render();
        this._updateHUD();
        this._advanceTurn(player);
        return;
      }
      // 没令牌了，给出提示
      this.log.add(fogResult.message, 'warning');
      return;
    }

    // 优先级 2：揭示规则
    const result = this.reveal.revealRule(player, pos.x, pos.y);

    if (result.success) {
      this.log.add(result.message, 'reveal');
      this.rendererA.render();
      this.rendererB.render();
      this._updateConsensusPanel();
      this._updateHUD();
      this._advanceTurn(player);
    } else {
      this.log.add(result.message, 'warning');
    }
  }

  _handleWait(player) {
    if (this.winner) return;
    if (player !== this.turn) {
      this.log.add(`现在不是 ${PLAYER_NAMES[player]} 的回合`, 'warning');
      return;
    }

    this.log.add(`${PLAYER_NAMES[player]} 等待`, 'system');
    this._advanceTurn(player);
  }

  _handleUndo() {
    if (this.history.length === 0) {
      this.log.add('没有可撤销的操作', 'warning');
      return;
    }

    const prevState = this.history.pop();
    this.state = prevState;
    this.engine = new GameEngine(this.state);
    this.rendererA.state = this.state;
    this.rendererB.state = this.state;
    this.reveal.state = this.state;

    this.rendererA.render();
    this.rendererB.render();
    this._updateConsensusPanel();
    this._updateHUD();
    this.log.add('↩ 撤销上一步', 'system');
  }

  _saveState() {
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.history.push(this.state.clone());
  }

  _undoState() {
    if (this.history.length > 0) {
      this.history.pop();
    }
  }

  _advanceTurn(player) {
    // 令牌重生：该玩家每走 N 步自动获得 1 个揭示令牌
    const reward = this.state.stepAndCheckTokenReward(player);
    if (reward.earned) {
      this.log.add(
        `🎫 ${PLAYER_NAMES[player]} 走了 ${reward.step} 步，获得 1 个揭示令牌！(共 ${reward.total} 个)`,
        'reveal'
      );
    }

    // 暗雾生成：每 N 步全局触发一次
    this._globalStepCount++;
    if (this._globalStepCount % DARK_FOG_INTERVAL === 0) {
      this._spawnDarkFog();
    }

    this.movesThisTurn++;
    if (this.movesThisTurn >= this.maxMovesPerTurn) {
      this.movesThisTurn = 0;
      this.turn = this.turn === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
      this.log.add(`轮到 ${PLAYER_NAMES[this.turn]}`, 'system');
    }
    this._updateHUD();
  }

  _updateHUD() {
    const posA = this.state.players[PLAYERS.A];
    const posB = this.state.players[PLAYERS.B];

    document.getElementById('player-a-pos').textContent = `位置: (${posA.x}, ${posA.y})`;
    document.getElementById('player-b-pos').textContent = `位置: (${posB.x}, ${posB.y})`;

    document.getElementById('turn-num').textContent = this.turn === PLAYERS.A ? 'A' : 'B';

    const tokensA = this.reveal.getRevealTokenCount(PLAYERS.A);
    const tokensB = this.reveal.getRevealTokenCount(PLAYERS.B);
    const stepsA = this.state.playerStepCounts[PLAYERS.A] || 0;
    const stepsB = this.state.playerStepCounts[PLAYERS.B] || 0;
    const fogCount = this.state.getDarkFogCount();
    document.getElementById('player-a-name').textContent = `玩家A (令牌: ${tokensA} | 步数: ${stepsA})`;
    document.getElementById('player-b-name').textContent = `玩家B (令牌: ${tokensB} | 步数: ${stepsB})`;
    const turnEl = document.getElementById('turn-indicator');
    if (turnEl) {
      turnEl.innerHTML = fogCount > 0
        ? `当前回合: <span id="turn-num">${this.turn === PLAYERS.A ? 'A' : 'B'}</span> 🌫️暗雾: ${fogCount}/${DARK_FOG_MAX}`
        : `当前回合: <span id="turn-num">${this.turn === PLAYERS.A ? 'A' : 'B'}</span>`;
    }

    // Highlight active player's board
    const wrapperA = document.getElementById('board-wrapper-a');
    const wrapperB = document.getElementById('board-wrapper-b');
    if (this.turn === PLAYERS.A) {
      wrapperA.classList.add('active-turn');
      wrapperB.classList.remove('active-turn');
    } else {
      wrapperB.classList.add('active-turn');
      wrapperA.classList.remove('active-turn');
    }
  }

  _showWinToast() {
    const toast = document.getElementById('win-toast');
    const text = document.getElementById('win-toast-text');
    text.textContent = `${PLAYER_NAMES[this.winner]} 通关！`;
    toast.classList.add('active');
  }

  _hideWinToast() {
    const toast = document.getElementById('win-toast');
    toast.classList.remove('active');
  }

  _nextLevel() {
    // 单关卡模式：通关后重新开始并自动 AI
    this._hideWinToast();
    const wasAutoPlay = this.autoPlay;
    if (this.autoPlay) {
      this.autoPlay = false;
      if (this.autoPlayTimer) {
        clearTimeout(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
    }
    this.log.add('🔄 重新挑战推块谜题', 'system');
    this.reset();
    if (wasAutoPlay) {
      setTimeout(() => this.startAutoPlay(this.autoPlaySpeed), 300);
    }
  }

  reset() {
    this._hideWinToast();
    const wasAutoPlay = this.autoPlay;
    if (this.autoPlay) {
      this.autoPlay = false;
      if (this.autoPlayTimer) {
        clearTimeout(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
    }
    // 完全按照 start() 模式从零重建
    this.state = new GameState(20, 15);
    this.engine = new GameEngine(this.state);
    this.rendererA = new BoardRenderer(this.state, PLAYERS.A);
    this.rendererB = new BoardRenderer(this.state, PLAYERS.B);
    this.reveal = new RevealSystem(this.state);
    this.log = new MessageLog('message-log');
    this._aiFlagMoveCounter = 0;
    this._globalStepCount = 0;

    this._loadLevel(this.currentLevel);
    this._initialReveal();
    this.rendererA.createGrid('board-a');
    this.rendererB.createGrid('board-b');
    this.rendererA.linkSibling(this.rendererB);
    this.rendererB.linkSibling(this.rendererA);
    this.rendererA.render();
    this.rendererB.render();
    this._updateHUD();
    this._updateConsensusPanel();

    const layout = document.getElementById('game-layout');
    if (layout) layout.classList.add('visible');
    this.log.add('🔄 重新挑战推块谜题', 'system');
    this.log.add('💡 同一棋盘，不同规则认知 —— 鼠标悬停看联动', 'system');
    if (this.autoPlay || wasAutoPlay) {
      this.log.add('🚩 AI 模式下，旗帜每5步更换位置', 'system');
    }
    if (wasAutoPlay) {
      setTimeout(() => this.startAutoPlay(this.autoPlaySpeed), 300);
    }
  }

  loadLevel(index) {
    this._hideWinToast();
    this.currentLevel = index;
    this.reset();
  }
}