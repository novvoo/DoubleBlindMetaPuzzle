export const LEVELS = [
  {
    id: 1,
    name: '推块谜题',
    width: 11,
    height: 9,
    startA: { x: 1, y: 4 },
    startB: { x: 9, y: 4 },
    cells: (() => {
      const cells = [];
      for (let y = 0; y < 9; y++) {
        cells[y] = [];
        for (let x = 0; x < 11; x++) {
          cells[y][x] = {
            terrain: (x === 0 || x === 10 || y === 0 || y === 8) ? 'wall' : 'floor',
            entities: [],
            revealedTo: [],
            rules: [],
          };
        }
      }
      // 巴巴分布在左半区（B 侧可推）
      cells[4][4].entities = [{ type: 'baba', name: '巴巴', icon: '🐑' }];
      cells[2][3].entities = [{ type: 'baba', name: '巴巴', icon: '🐑' }];
      cells[6][2].entities = [{ type: 'baba', name: '巴巴', icon: '🐑' }];
      cells[3][6].entities = [{ type: 'baba', name: '巴巴', icon: '🐑' }];
      // 凯凯分布在右半区（A 侧可推）
      cells[4][6].entities = [{ type: 'keke', name: '凯凯', icon: '🐱' }];
      cells[6][5].entities = [{ type: 'keke', name: '凯凯', icon: '🐱' }];
      cells[2][7].entities = [{ type: 'keke', name: '凯凯', icon: '🐱' }];
      cells[5][3].entities = [{ type: 'keke', name: '凯凯', icon: '🐱' }];
      // 随机旗帜：避开 AB 起始位置及其初始可见十字区域（曼哈顿距离≤1），避开其他实体
      (() => {
        const ax = 1, ay = 4;  // startA
        const bx = 9, by = 4;  // startB
        const available = [];
        for (let y = 1; y < 8; y++) {
          for (let x = 1; x < 10; x++) {
            if (cells[y][x].terrain === 'wall') continue;
            if ((x === ax && y === ay) || (x === bx && y === by)) continue;
            if (Math.abs(x - ax) + Math.abs(y - ay) <= 1) continue;
            if (Math.abs(x - bx) + Math.abs(y - by) <= 1) continue;
            if (cells[y][x].entities.length > 0) continue;
            available.push({ x, y });
          }
        }
        const pos = available[Math.floor(Math.random() * available.length)];
        cells[pos.y][pos.x].entities = [{ type: 'flag', name: '旗帜', icon: '🚩' }];
      })();
      // 规则方块
      cells[2][2].rules = [{ entity: 'BABA', property: 'push' }];
      cells[6][8].rules = [{ entity: 'KEKE', property: 'push' }];
      cells[2][8].rules = [{ entity: 'FLAG', property: 'win' }];
      return cells;
    })(),
    rulesA: {
      'wall': 'stop',
      'player_a': 'you',
      'player_b': 'stop',
      'baba': 'stop',
      'keke': 'push',
      'flag': 'win',
    },
    rulesB: {
      'wall': 'stop',
      'player_b': 'you',
      'player_a': 'stop',
      'baba': 'push',
      'keke': 'stop',
      'flag': 'win',
    },
    description: 'A 推🐱凯凯 · B 推🐑巴巴 · 合作清障，踩🚩旗帜获胜！',
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

export function getLevelCount() {
  return LEVELS.length;
}
