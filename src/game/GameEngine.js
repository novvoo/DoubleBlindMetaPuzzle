import { PLAYERS, DIRECTIONS, PROPERTIES } from './constants.js';

export class GameEngine {
  constructor(state) {
    this.state = state;
  }

  movePlayer(player, direction) {
    const pos = this.state.getPlayerPosition(player);
    if (!pos) {
      return {
        success: false,
        message: `无法获取 ${player} 的位置`,
        events: [],
      };
    }

    const { x, y } = pos;
    let nx = x;
    let ny = y;

    switch (direction) {
      case DIRECTIONS.UP:    ny--; break;
      case DIRECTIONS.DOWN:  ny++; break;
      case DIRECTIONS.LEFT:  nx--; break;
      case DIRECTIONS.RIGHT: nx++; break;
      default:
        return { success: false, message: '无效方向', events: [] };
    }

    if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
      return { success: false, message: '撞墙了！边界', events: [] };
    }

    const fromCell = this.state.grid.cells[y][x];
    const toCell = this.state.grid.cells[ny][nx];

    const moveResult = this._checkMove(player, x, y, nx, ny);
    if (!moveResult.canMove) {
      return { success: false, message: moveResult.reason || '无法移动', events: [] };
    }

    if (moveResult.pushEntity) {
      this._pushEntity(player, nx, ny, direction);
    }

    fromCell.entities = fromCell.entities.filter(
      e => e.type !== `player_${player.toLowerCase()}`
    );

    if (!toCell.entities) toCell.entities = [];
    // 去重：同一格不留两个同类玩家实体
    toCell.entities = toCell.entities.filter(
      e => e.type !== `player_${player.toLowerCase()}`
    );
    toCell.entities.push({
      type: `player_${player.toLowerCase()}`,
      player,
      name: player === PLAYERS.A ? '玩家A' : '玩家B',
      icon: player === PLAYERS.A ? '🅰' : '🅱',
    });

    this.state.players[player] = { x: nx, y: ny };
    if (!this.state.playerPositions) this.state.playerPositions = {};
    this.state.playerPositions[player] = { x: nx, y: ny };

    const events = [];
    events.push({ type: 'move', from: { x, y }, to: { x: nx, y: ny } });

    const winResult = this._checkWin(player, nx, ny);
    if (winResult) {
      events.push({ type: 'win', ...winResult });
    }

    return { success: true, message: '', events };
  }

  _checkMove(player, fromX, fromY, toX, toY) {
    const toCell = this.state.grid.cells[toY][toX];

    if (toCell.terrain === 'wall') {
      const wallProperty = this.state.getEntityProperty(player, 'wall');
      if (wallProperty === PROPERTIES.STOP) {
        return { canMove: false, reason: '墙是停止，无法通过' };
      }
    }

    const entities = toCell.entities || [];
    let pushEntity = null;
    let hasWin = false;
    let hasStop = false;

    for (const entity of entities) {
      const prop = this.state.getEntityProperty(player, entity.type);

      if (prop === PROPERTIES.STOP) {
        hasStop = true;
      }
      if (prop === PROPERTIES.PUSH) {
        pushEntity = entity;
      }
      if (prop === PROPERTIES.WIN) {
        hasWin = true;
      }
    }

    // STOP 优先级最高
    if (hasStop) {
      return { canMove: false, reason: '有障碍物阻挡' };
    }

    if (pushEntity) {
      return { canMove: true, pushEntity };
    }

    if (hasWin) {
      return { canMove: true };
    }

    return { canMove: true };
  }

  _pushEntity(player, x, y, direction) {
    const cell = this.state.grid.cells[y][x];
    const entity = cell.entities.find(e => {
      const prop = this.state.getEntityProperty(player, e.type);
      return prop === PROPERTIES.PUSH;
    });

    if (!entity) return;

    let pushX = x + direction.x;
    let pushY = y + direction.y;

    if (pushX < 0 || pushX >= this.state.width || pushY < 0 || pushY >= this.state.height) {
      return;
    }

    const targetCell = this.state.grid.cells[pushY][pushX];

    if (targetCell.terrain === 'wall') {
      const wallProperty = this.state.getEntityProperty(player, 'wall');
      if (wallProperty === PROPERTIES.STOP) {
        return;
      }
    }

    const targetEntities = targetCell.entities || [];
    for (const targetEntity of targetEntities) {
      const prop = this.state.getEntityProperty(player, targetEntity.type);
      if (prop === PROPERTIES.STOP || prop === PROPERTIES.PUSH) {
        return;
      }
    }

    cell.entities = cell.entities.filter(e => e !== entity);
    // 去重后再放入
    targetCell.entities = targetCell.entities.filter(
      e => e.type !== entity.type
    );
    targetCell.entities.push(entity);

    if (entity.type === 'rule_block') {
      this._updateRulesFromBlock(entity, pushX, pushY);
    }
  }

  _updateRulesFromBlock(block, x, y) {
    const cell = this.state.grid.cells[y][x];
    if (!cell || !cell.rules || cell.rules.length === 0) return;

    const rule = cell.rules[0];
    if (rule) {
      for (const p of [PLAYERS.A, PLAYERS.B]) {
        const playerRules = this.state.playerRules[p];
        playerRules[rule.entity] = rule.property;
      }
    }
  }

  _checkWin(player, x, y) {
    const cell = this.state.grid.cells[y][x];
    const entities = cell.entities || [];

    for (const entity of entities) {
      // 优先查玩家自身规则，再查已揭示的共享规则（共识）
      let prop = this.state.getEntityProperty(player, entity.type);
      if (prop === PROPERTIES.NONE) {
        // 回退到已揭示规则
        const entityKey = entity.type.toLowerCase();
        for (const revealed of this.state.revealedRules) {
          if (revealed.rule.entity.toLowerCase() === entityKey) {
            prop = revealed.rule.property.toLowerCase();
            break;
          }
        }
      }
      if (prop === PROPERTIES.WIN) {
        return { entity, player };
      }
    }

    return null;
  }

  canPlayerMove(player, direction) {
    const pos = this.state.getPlayerPosition(player);
    if (!pos) return false;

    const { x, y } = pos;
    let nx = x;
    let ny = y;

    switch (direction) {
      case DIRECTIONS.UP:    ny--; break;
      case DIRECTIONS.DOWN:  ny++; break;
      case DIRECTIONS.LEFT:  nx--; break;
      case DIRECTIONS.RIGHT: nx++; break;
      default: return false;
    }

    if (nx < 0 || nx >= this.state.width || ny < 0 || ny >= this.state.height) {
      return false;
    }

    const result = this._checkMove(player, x, y, nx, ny);
    return result.canMove;
  }
}