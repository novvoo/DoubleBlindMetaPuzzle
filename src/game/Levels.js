// 辅助函数：检查格子(x,y)上下左右至少有一格不是墙
function hasOpenAdjacent(cells, x, y, w, h) {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h && cells[ny][nx].terrain !== 'wall') {
      return true;
    }
  }
  return false;
}

export const LEVELS = [
  {
    id: 1,
    name: '推块谜题',
    width: 11,
    height: 9,
    startA: { x: 1, y: 4 },
    startB: { x: 9, y: 4 },
    cells: (() => {
      const W = 11, H = 9;
      const cells = [];
      for (let y = 0; y < H; y++) {
        cells[y] = [];
        for (let x = 0; x < W; x++) {
          cells[y][x] = {
            terrain: 'floor',
            entities: [],
            revealedTo: [],
            rules: [],
          };
        }
      }
      // ── 内部墙体：H / Z / N 字型连通墙块，AB 均无法推动（wall IS STOP）──
      // H 字型：右侧双竖 + 中横（6格，右上留空给 B 留上方出路）
      cells[3][7].terrain = 'wall'; cells[3][8].terrain = 'wall';
      cells[4][8].terrain = 'wall';
      cells[5][7].terrain = 'wall'; cells[5][8].terrain = 'wall'; cells[5][9].terrain = 'wall';
      // Z 字型：左上 → 右下翻折（5格）
      cells[1][4].terrain = 'wall'; cells[1][5].terrain = 'wall';
      cells[2][4].terrain = 'wall';
      cells[3][3].terrain = 'wall'; cells[3][4].terrain = 'wall';
      // N 字型：右下连通（5格），远离 A 起始位
      cells[6][7].terrain = 'wall'; cells[6][9].terrain = 'wall';
      cells[7][7].terrain = 'wall'; cells[7][8].terrain = 'wall'; cells[7][9].terrain = 'wall';
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
      // 随机旗帜：距离 A/B 至少5曼哈顿距离，防止开局秒赢，避开其他实体，且四周至少一个非墙
      (() => {
        const ax = 1, ay = 4;  // startA
        const bx = 9, by = 4;  // startB
        const available = [];
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            if (cells[y][x].terrain === 'wall') continue;
            if ((x === ax && y === ay) || (x === bx && y === by)) continue;
            if (Math.abs(x - ax) + Math.abs(y - ay) < 5) continue;
            if (Math.abs(x - bx) + Math.abs(y - by) < 5) continue;
            if (cells[y][x].entities.length > 0) continue;
            if (!hasOpenAdjacent(cells, x, y, W, H)) continue;  // 四周不能全被墙堵死
            available.push({ x, y });
          }
        }
        if (available.length === 0) {
          console.warn('⚠ 旗帜无合法放置位！回退到无开口校验');
          // 回退：只去掉四周开口要求，重试一次
          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              if (cells[y][x].terrain === 'wall') continue;
              if ((x === ax && y === ay) || (x === bx && y === by)) continue;
              if (Math.abs(x - ax) + Math.abs(y - ay) < 5) continue;
              if (Math.abs(x - bx) + Math.abs(y - by) < 5) continue;
              if (cells[y][x].entities.length > 0) continue;
              available.push({ x, y });
            }
          }
        }
        const pos = available[Math.floor(Math.random() * available.length)];
        cells[pos.y][pos.x].entities = [{ type: 'flag', name: '旗帜', icon: '🚩' }];
      })();
      // ── 校验：A/B 起始位四周不能全被墙堵死 ──
      (() => {
        const ax = 1, ay = 4, bx = 9, by = 4;
        if (!hasOpenAdjacent(cells, ax, ay, W, H)) {
          console.error('❌ A 起始位(' + ax + ',' + ay + ')上下左右全被墙堵死！');
        }
        if (!hasOpenAdjacent(cells, bx, by, W, H)) {
          console.error('❌ B 起始位(' + bx + ',' + by + ')上下左右全被墙堵死！');
        }
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
