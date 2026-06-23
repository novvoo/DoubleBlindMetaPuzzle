# 🎭 双盲元谜题 · Double Blind Meta Puzzle

> 同一棋盘，两套认知 —— AI 合作推块解谜，你看得见的规则，对队友来说全是乱码。

---

## 🎯 游戏主题

**双盲元谜题** 是一款逻辑推理合作游戏。两位玩家（或 AI）共享同一个 11×9 棋盘，但各自拥有**完全不同的规则认知**。A 眼里的世界和 B 眼里的世界互不相通，只有通过**揭示隐藏规则**和**悬停联动**，才能逐步拼凑出真实世界的规则全貌，合作清除障碍，最终抵达旗帜。

棋盘上有 4 只 🐑巴巴 和 4 只 🐱凯凯 作为障碍物，外围被墙壁包围。A 只能推动凯凯，B 只能推动巴巴 —— 双方必须跨半区合作。

核心矛盾：
- A 眼中的 🐑巴巴 是 **STOP**（不可推、不可穿过），但 B 眼中它是 **PUSH**（可推）
- B 眼中的 🐱凯凯 是 **STOP**，但 A 眼中它是 **PUSH**
- 双方都不知道对方的规则，只能靠揭示或观察对方行为来推断

---

## 📐 棋盘与实体

### 棋盘规格

| 属性 | 值 |
|------|-----|
| 尺寸 | 11 × 9（内部 9×7 可通行区域） |
| 墙壁 | 外围一圈 + 地图边界 |
| 起始位置 | A: (1,4) 左侧；B: (9,4) 右侧 |
| A/B 互换 | 50% 概率随机交换起始位置和规则集 |

### 实体类型枚举

| 常量 | 值 | 说明 |
|------|-----|------|
| `ENTITY_TYPES.PLAYER_A` | `'player_a'` | 玩家A |
| `ENTITY_TYPES.PLAYER_B` | `'player_b'` | 玩家B |
| `ENTITY_TYPES.BABA` | `'baba'` | 巴巴（羊） |
| `ENTITY_TYPES.KEKE` | `'keke'` | 凯凯（猫） |
| `ENTITY_TYPES.FLAG` | `'flag'` | 旗帜 |
| `ENTITY_TYPES.RULE_BLOCK` | `'rule_block'` | 隐藏规则方块 |
| `ENTITY_TYPES.WALL` | `'wall'` | 墙壁 |
| `ENTITY_TYPES.FLOOR` | `'floor'` | 地板 |

### 属性类型枚举

| 常量 | 值 | 含义 |
|------|-----|------|
| `PROPERTIES.YOU` | `'you'` | 该实体是你自己 |
| `PROPERTIES.STOP` | `'stop'` | 阻挡，不可踏入该格 |
| `PROPERTIES.PUSH` | `'push'` | 可推动，踏入时将其向前推 |
| `PROPERTIES.WIN` | `'win'` | 获胜，踩上即胜利 |
| `PROPERTIES.NONE` | `'none'` | 无特殊属性（默认） |

### 实体清单

| 图标 | 类型 | 数量 | 分布 |
|------|------|------|------|
| 🅰 | player_a | 1 | 左侧起始 (1,4) |
| 🅱 | player_b | 1 | 右侧起始 (9,4) |
| 🐑 | baba | 4 | 左半区： (4,4) (2,3) (6,2) (3,6) |
| 🐱 | keke | 4 | 右半区： (4,6) (6,5) (2,7) (5,3) |
| 🚩 | flag | 1 | 随机位置（排除 AB 起始及可见区 + 实体格） |
| 📜 | rule_block | 3 | 固定坐标 |

### 隐藏规则方块位置

| 坐标 | 规则内容 | 作用 |
|------|----------|------|
| (2, 2) | `BABA IS PUSH` | A 揭示后 → A 也能推巴巴 |
| (6, 8) | `KEKE IS PUSH` | B 揭示后 → B 也能推凯凯 |
| (2, 8) | `FLAG IS WIN` | 揭示后旗帜对揭示方生效 |

### 格子（Cell）数据结构

每个格子是一个对象，包含以下字段：

```
Cell {
  terrain: 'wall' | 'floor',      // 地形类型
  entities: Entity[],              // 该格上的实体列表
  revealedTo: ('A' | 'B')[],       // 哪些玩家已揭示此格
  rules: Rule[]                    // 该格上的隐藏规则
}

Entity {
  type: string,                    // 实体类型标识
  name: string,                    // 中文显示名
  icon: string,                    // emoji 图标
  player?: 'A' | 'B'              // 所有方（仅玩家实体）
}

Rule {
  entity: string,                  // 目标实体（大写，如 'BABA'）
  property: string                 // 赋予的属性（如 'push'）
}
```

---

## 🧩 核心规则

### 1. 主观规则（Subjective Rules）

同一实体，两位玩家看到的属性**完全不同**：

| 实体 | 🔴 玩家A 眼中的属性 | 🔵 玩家B 眼中的属性 |
|------|---------------------|---------------------|
| 墙壁 | STOP | STOP |
| player_a (自己) | YOU | STOP |
| player_b (对方) | STOP | YOU |
| 🐑 baba | STOP | **PUSH** |
| 🐱 keke | **PUSH** | STOP |
| 🚩 flag | WIN | WIN |

- A 只能推动 🐱凯凯，🐑巴巴对 A 而言是阻挡（STOP）
- B 只能推动 🐑巴巴，🐱凯凯对 B 而言是阻挡（STOP）
- 双方必须跨半区合作：A 去右半区清凯凯，B 去左半区清巴巴
- 墙壁对所有玩家始终是 STOP

### 2. 独立视野 + 🧠 3 步记忆

**可见性算法**：

1. 每位玩家移动后，调用 `recordVisit(player, x, y)` 记录该位置到 `playerPath[player]` 列表
2. 该列表最大长度为 3（超出自动丢掉最早记录）：`playerPath[player].shift()`
3. 然后调用 `recomputeVisibility(player)`：
   - **先清空**该玩家在所有格子上的 `revealedTo` 记录
   - **遍历** `playerPath` 中保留的所有位置（最多 3 个）
   - 对每个位置，将其自身 + 上下左右 4 个邻格（十字形）标记为该玩家可见
4. 结果：玩家能看到「当前位置」及「最近 3 步访问过的位置」这最多 15 个格子的十字可见区
5. 超过 3 步的旧位置自动退回到迷雾中，无法靠绕圈遍历拼出完整地图

**可见格判定**：`state.isRevealedTo(player, x, y)` 检查 `cell.revealedTo` 是否包含该玩家。

**对方鬼影**：在迷雾格上如果对方玩家正好在那里，用 opacity 0.35 的半透明图标（🅰/🅱）显示一个鬼影。

### 3. 轮流行动

- 每回合每位玩家只能走 1 步（`maxMovesPerTurn = 1`）
- 交替操作：A → B → A → B ...
- 回合计数：每走一步 `movesThisTurn++`；当 `movesThisTurn >= maxMovesPerTurn` 时切换当前玩家
- **回合中可以使用**：揭示（Q/U）和等待（E/O），两者执行后也会切换回合
- **先手随机**：第一回合 50% A 或 B 先手

### 4. 揭示令牌（Reveal Token）

- 每位玩家初始拥有 **3 次**揭示机会
- 站在隐藏规则方块（`cell.rules.length > 0`）上按 Q（A）或 U（B）
- 前提条件检查：
  1. `hasRevealToken(player)` → 令牌 > 0
  2. 当前位置的 cell 有 `rules`
  3. 该规则尚未被揭示（`isRuleRevealed(x, y)` 返回 false）
- 成功后：`consumeRevealToken(player)` 令牌 -1，规则写入 `revealedRules` 数组（含时间戳、揭示者、坐标）
- 揭示后的规则进入**共识面板**，双方都可见
- 揭示消耗令牌，同时**自动切换回合**

### 5. 主观推块

- **推块条件**：
  1. 目标格上有一个对该玩家属性为 `PUSH` 的实体
  2. 该格没有属性为 `STOP` 的实体（STOP 优先级最高）
  3. 推动方向上的目标格（实体被推往的格子）必须是空地板格
- **推块方向**：实体总是向玩家移动的方向前推一格
- **推动目标格检查**：
  - 不能是墙壁（除非墙壁对玩家不是 STOP）
  - 不能有其他 STOP 或 PUSH 实体
- 推动后：实体从原格移到新格，去重处理

### 6. 胜利条件

- **判定时机**：每次玩家移动后，检查玩家脚下格子的实体列表中是否有属性为 WIN 的实体
- 任何一方踩上旗帜且该玩家眼中 FLAG IS WIN → 立即获胜
- 若某玩家未揭示 FLAG IS WIN 规则，站在旗帜上不会触发胜利
- 胜利后：AI 自动暂停，显示 Toast 提示

### 7. 悬停联动

- 鼠标悬停一方棋盘 → 另一方棋盘**同坐标格子高亮**（金色光晕 `cross-highlight` class）
- 实现：`BoardRenderer.linkSibling()` 关联两个棋盘，`mouseenter`/`mouseleave` 事件触发
- 用于双人合作时指路讨论

### 8. 动态旗帜（AI 模式专属）

- AI 自动对战中，旗帜**每一步**随机移动到棋盘空位
- 候选位置筛选规则：
  1. 不是墙壁（`terrain !== 'wall'`）
  2. 不在 A 或 B 的脚下
  3. 不在 A 或 B 的可见十字区（曼哈顿距离 ≤ 1）
  4. 没有其他实体
- 旗帜移动到新位置后，**立即对双方揭示**（`revealTo` A 和 B）
- 重新渲染两个棋盘并写入日志
- 目的是防止 AI 一次性找到旗帜后直接路径规划通关，强制持续探索

---

## 🧮 碰撞检测与移动逻辑（GameEngine）

### `_checkMove(player, fromX, fromY, toX, toY)` 详细流程

```
1. 获取目标格上的 terrain 和 entities
2. 墙壁检查：
   - 如果 terrain === 'wall' 且玩家眼中 wall 属性 === STOP → 阻挡
3. 遍历目标格所有实体：
   - 属性 === STOP  → hasStop = true（阻挡，无法移动）
   - 属性 === PUSH  → pushEntity = 该实体（可推）
   - 属性 === WIN   → hasWin = true（可踏入）
4. 优先级判断：
   - hasStop  → canMove: false（STOP 优先级最高）
   - pushEntity 存在 → canMove: true，附带 pushEntity 引用
   - hasWin  → canMove: true
   - 其他 → canMove: true（空格，正常移动）
```

### 属性优先级链

```
STOP > PUSH > WIN > NONE（空格自由通行）
```

### 移动执行流程

```
movePlayer(player, direction)
  │
  ├── 计算目标坐标 (nx, ny)
  ├── 边界检查（超出棋盘 → 失败）
  ├── _checkMove(player, x, y, nx, ny)
  │   └── 返回 { canMove, pushEntity?, reason? }
  ├── 如果 pushEntity 存在 → _pushEntity(player, nx, ny, direction)
  │   ├── 计算推动目标 (pushX, pushY) = entity当前位置 + 方向向量
  │   ├── 检查推动目标格是否可容纳（非墙、无 STOP/PUSH 实体）
  │   └── 将实体从原格移除，加入目标格（去重）
  ├── 从原格移除玩家实体
  ├── 玩家实体加入目标格（去重：先 filter 掉旧 player_*）
  ├── 更新 state.players[player] = { x: nx, y: ny }
  ├── 更新 state.playerPositions[player] = { x: nx, y: ny }
  ├── 生成事件列表：
  │   ├── { type: 'move', from, to }
  │   └── _checkWin → { type: 'win', ... }（如果踩赢）
  └── 返回 { success, message, events }
```

### 推块碰撞规则

```
玩家 A 推 🐱凯凯：
  [🅰] → [🐱] → [  ]
  结果： [  ] [🅰] [🐱]

玩家 B 推 🐑巴巴：
  [🅱] → [🐑] → [  ]
  结果： [  ] [🅱] [🐑]

无法推的情况：
  [🅰] → [🐱] → [🧱墙]  → 推块失败（目标格不可用）
  [🅰] → [🐱] → [🐑]     → 推块失败（目标格有 PUSH/STOP 实体）
  [🅰] → [🐑] → [  ]     → A 眼中 baba=STOP，根本无法踏入巴巴格
```

---

## 🧠 AI 策略（AIController）—— 完整决策链

### 决策流程图

```
decide(player, lastFailedDir?)
  │
  ├── 失败追踪：
  │   ├── 如果上次失败 → stuckCounter[player]++，记录失败方向
  │   └── 如果成功移动 → stuckCounter 重置，清除失败记录
  │
  ├── 1. 揭示检查（最高优先级）
  │   └── _shouldReveal(player, x, y)
  │       ├── cell.rules 存在且非空？
  │       ├── 未被揭示过？ isRuleRevealed(x,y) === false？
  │       └── 有揭示令牌？ hasRevealToken(player) === true？
  │       → 全部满足 → { action: 'reveal' }
  │
  ├── 2. 旗帜追逐
  │   └── _findVisibleFlag(player)
  │       └── 遍历所有已揭示格，查找 flag 实体
  │       └── 找到 → _findPath(player, from, to) BFS寻路
  │           ├── 只在已揭示格上寻路（isRevealedTo）
  │           ├── BFS 方向随机打乱（shuffleDirs）
  │           └── 找到路径 → { action: 'move', direction }
  │
  ├── 3. 迷雾探索
  │   └── _exploreDirection(player, x, y)
  │       ├── BFS 搜索已揭示格的"前沿"（与迷雾相邻的已揭示格）
  │       ├── 方向随机打乱避免偏向
  │       ├── 按距离排序，找最近前沿
  │       ├── 直接相邻 → 返回该方向
  │       └── 需路径 → BFS 寻路到前沿格，返回第一步方向
  │
  ├── 4. 随机脱困（stuckCounter > 2）
  │   └── _tryAnyDirection(player, x, y)
  │       └── 随机打乱 4 方向，依次尝试第一个可行的
  │
  └── 5. 等待（无路可走）
      └── { action: 'wait' }
```

### AI BFS 寻路算法

```
_findPath(player, fromX, fromY, toX, toY):
  初始化 visited = Set(), queue = [{x:fromX, y:fromY, path:[]}]
  随机打乱 4 个方向顺序（避免路径偏向）
  
  while queue 非空:
    current = queue.shift()
    如果 current 到达目标 → 返回 current.path
    
    遍历 4 个方向（已打乱）:
      nx, ny = 新坐标
      跳过已访问 / 越界 / 未揭示的格子
      如果 _canStepInto(player, nx, ny):
        visited.add(key)
        queue.push({ x:nx, y:ny, path: [...current.path, {x:nx, y:ny}] })
  
  返回 null（无路径）
```

### `_canStepInto` 逻辑

```
_canStepInto(player, x, y):
  1. 墙壁检查：
     terrain === 'wall' 且 _getEffectiveProperty('wall') === STOP → false
  2. 遍历该格所有实体：
     对每个实体，获取 _getEffectiveProperty(player, entityType)
     如果有任何实体的属性是 STOP → false
  3. 通过所有检查 → true
```

### `_getEffectiveProperty` —— 综合认知

```
_getEffectiveProperty(player, entityType):
  1. 遍历所有 revealedRules（任何一方揭示的规则）
     如果已揭示规则匹配该 entityType → 返回该规则中的属性
  2. 回退到玩家自身的 playerRules → 返回主观规则中的属性
```

这意味着：一旦某方揭示了 BABA IS PUSH，另一方 AI 的路径计算中也会将巴巴视为 PUSH 而非 STOP。

### AI 探索策略详细

```
_exploreDirection(player, x, y):
  1. 从当前位置 BFS，只走已揭示且可通的格子
  2. 对每个已揭示格的邻居（4 方向）：
     - 如果邻居未揭示（迷雾）→ 该已揭示格就是"前沿"
     - 记录 { targetX, targetY, dist, firstStepDir }
  3. 所有前沿格按距离排序，取最近的
  4. 距离 == 0（直接相邻）→ 直接返回方向
  5. 距离 > 0 → BFS 寻路到前沿格，返回路径第一步方向
  6. 无前沿 → 返回 null（触发等待）
```

---

## 🗃️ 状态管理（GameState）

### 核心状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `width` / `height` | number | 棋盘尺寸（关卡加载后更新） |
| `players` | `{ A: {x,y}, B: {x,y} }` | 玩家坐标 |
| `playerPositions` | `{ A: {x,y}, B: {x,y} }` | 第二套坐标（引擎同步用） |
| `grid.cells` | `Cell[][]` | 棋盘二维数组 |
| `playerRules` | `{ A: RuleMap, B: RuleMap }` | 各玩家规则映射表 |
| `revealTokens` | `{ A: number, B: number }` | 剩余揭示令牌 |
| `revealedRules` | `RevealedRule[]` | 已揭示规则列表 |
| `playerPath` | `{ A: Pos[], B: Pos[] }` | 最近 3 步路径 |

### `revealedRules` 数据结构

```
RevealedRule {
  player: 'A' | 'B',         // 谁揭示的
  x: number, y: number,       // 规则坐标
  rule: { entity, property }, // 规则内容
  timestamp: number           // Unix 毫秒时间戳
}
```

### Clone（状态快照）

撤销系统依赖 `GameState.clone()` 做深拷贝：

```
clone():
  新 GameState(width, height)
  ├── players: 浅拷贝 {x, y}
  ├── grid.cells: 逐格复制 terrain, entities[...], revealedTo[...], rules[...]
  ├── playerRules: 展开拷贝
  ├── revealTokens: 展开拷贝
  ├── revealedRules: [...展开]
  └── playerPath: map 拷贝每个 {x, y}
```

### 撤销系统

| 参数 | 值 | 说明 |
|------|-----|------|
| `history[]` 最大深度 | 50 | 超过时 shift 掉最早快照 |
| 保存时机 | 每次移动前 `_saveState()` | 保存当前完整状态 |
| 回滚时机 | 移动失败时 `_undoState()` | 弹出刚保存的快照 |
| 撤销操作 | Ctrl+Z `_handleUndo()` | 弹出上一个状态并恢复 |

撤销时重建所有依赖 state 的对象（`GameEngine`, `BoardRenderer`, `RevealSystem`）。

---

## 👁️ 视野与揭示系统（RevealSystem）

### 视野揭示

```
reveal(player, x, y):
  1. state.revealTo(player, x, y)           // 揭示该格
  2. 遍历 4 邻格 (上下左右)：
     state.revealTo(player, ax, ay)          // 揭示邻格
  3. 返回 changed[] 数组（变化的坐标列表）

revealTo(player, x, y):
  如果 cell.revealedTo 不包含该玩家 → push 进去
```

### 规则揭示

```
revealRule(player, x, y):
  1. 检查令牌 → hasRevealToken(player) 否则返回失败
  2. 检查 cell.rules 存在 → cell.rules.length > 0
  3. 检查未揭示 → !isRuleRevealed(x, y)
  4. consumeRevealToken(player) → 令牌 -1
  5. state.revealRule(player, x, y) → 写入 revealedRules
  6. 返回 { success, message, rule, x, y }
```

### 3步记忆重算

```
recomputeVisibility(player):
  1. 遍历所有格子，从 revealedTo 中删除该玩家
  2. 遍历 playerPath[player]（最近 3 步）：
     对每个位置 + 4 邻格 → revealTo(player, x, y)
```

---

## 🎨 UI 渲染逻辑（BoardRenderer）

### 渲染流程

```
render():
  遍历所有格子 (y=0..height, x=0..width)
  对每个格子调用 renderCell(cell, x, y)
```

### renderCell 详细逻辑

```
renderCell(cell, x, y):
  1. 确定可见性：
     - 有 perspective → 检查该玩家的 isRevealedTo
     - 无 perspective → A 或 B 任何一方可见即可
     
  2. 如果不可见（迷雾）：
     - cell 设为 'cell fog'
     - 对方在此 → 显示鬼影（半透明图标）
     - 否则 → 纯迷雾
     
  3. 如果可见：
     - cell 设为 'cell revealed'
     - terrain === wall → 加 'wall' + 🧱图标
     - terrain === floor → 加 'floor'
     
  4. 视角边框：
     - visible-A: 仅 A 可见 → accent-a 边框
     - visible-B: 仅 B 可见 → accent-b 边框
     - visible-both: 双方可见 → accent-purple 边框
     
  5. 规则方块：
     - 未揭示 → 'rule-hidden'（虚线边框 + 半透明背景）+ "?"占位符
     - 已揭示 → 'rule-revealed'（金色实线 + 呼吸动画）+ 规则文字
     
  6. 实体渲染：
     - 去重（同一格不会有重复的同类型实体）
     - 玩家A/B 用 accent 颜色 + 发光文字阴影
     - 其他实体用标准图标
     
  7. Tooltip 生成：
     - 地形 + 所有实体名 + 规则信息
```

### 悬停联动实现

```
linkSibling(siblingRenderer):
  this.siblingRenderer = siblingRenderer

_highlightCross(x, y):
  在 siblingRenderer.grid 中找同坐标格子
  加 'cross-highlight' class（金色光晕）

_clearCrossHighlight():
  遍历 siblingRenderer.grid 所有格子
  移除 'cross-highlight' class
```

---

## ⚙️ 关卡系统（Levels.js）

### 关卡数据结构

```
Level {
  id: number,                    // 关卡ID
  name: string,                  // 关卡名称
  width: number,                 // 宽度
  height: number,                // 高度
  startA: { x, y },             // A 起始位置
  startB: { x, y },             // B 起始位置
  cells: Cell[][],               // 棋盘（含地形、实体、规则）
  rulesA: { [entityType]: property },  // A 的主观规则集
  rulesB: { [entityType]: property },  // B 的主观规则集
  description: string            // 关卡描述
}
```

### 旗帜初始位置随机算法

```
生成旗帜位置:
  available = []
  遍历所有内部格 (x:1..9, y:1..7):
    排除条件：
    - 是墙壁 → 跳过
    - 是 A 或 B 的起始位置 → 跳过
    - 曼哈顿距离离 A ≤ 1 → 跳过
    - 曼哈顿距离离 B ≤ 1 → 跳过
    - 格子上已有实体 → 跳过
    通过 → available.push({ x, y })
  随机从 available 中选取一个位置放置旗帜
```

---

## 🎮 输入处理（InputHandler）

### 键位映射

```
玩家A:
  direction: { ArrowUp/ArrowDown/ArrowLeft/ArrowRight, w/s/a/d }
  reveal: q
  wait: e

玩家B:
  direction: { i/k/j/l }
  reveal: u
  wait: o

全局:
  undo: Ctrl+Z
```

### 输入过滤

```
_handleKey(e):
  1. 如果焦点在 input/select/textarea 或 contentEditable → 忽略（让浏览器正常处理）
  2. Ctrl+Z → 触发撤销（阻止默认行为）
  3. q → 触发 A 揭示
  4. u → 触发 B 揭示
  5. e → 触发 A 等待
  6. o → 触发 B 等待
  7. 匹配 direction → 触发对应玩家移动
```

---

## 🔄 游戏主循环（Game.js）

### 启动流程

```
start():
  1. 创建 GameState(20, 15)
  2. 创建 GameEngine、BoardRenderer(A)、BoardRenderer(B)
  3. 创建 RevealSystem、MessageLog、InputHandler
  4. 设置 InputHandler 回调
  5. 绑定键盘事件
  6. _setupLevelSelect() / _setupButtons()
  7. _loadLevel(1) → 加载关卡数据、随机化 AB
  8. _initialReveal() → 记录初始位置、重算视野
  9. 创建双棋盘 DOM
  10. linkSibling 关联悬停联动
  11. render() + _updateHUD()
  12. started = true
  13. 写欢迎日志
```

### AI 自动对战流程

```
startAutoPlay(speed):
  autoPlay = true, 创建 AIController
  _scheduleAIStep()

_scheduleAIStep():
  如果 !autoPlay 或 winner → 停止
  setTimeout(_aiStep, autoPlaySpeed)

_aiStep():
  1. ai.decide(currentPlayer) → { action, direction? }
  2. switch action:
     'move'    → _tryAIMove() → 保存状态、移动、失败则回滚
     'reveal'  → _handleReveal()
     'wait'    → _handleWait()
  3. 如果赢 → 停止AI
  4. _aiFlagMoveCounter++, 达到阈值 → _relocateFlag()
  5. _scheduleAIStep() 继续循环
```

### `_relocateFlag()` 详细算法

```
_relocateFlag():
  1. 找到当前旗帜位置并移除
  2. 收集候选空位 candidates:
     遍历所有格子:
       - terrain !== 'wall'
       - 不是 posA 所在格
       - 不是 posB 所在格
       - 曼哈顿距离 posA > 1（不在可见十字区）
       - 曼哈顿距离 posB > 1
       - entities 为空
  3. 从 candidates 随机选一个
  4. 放置旗帜 + revealTo(A) + revealTo(B)
  5. 重新渲染两个棋盘 + 写日志
```

### 回合管理

```
_advanceTurn(player):
  movesThisTurn++
  如果 movesThisTurn >= maxMovesPerTurn(1):
    movesThisTurn = 0
    turn = turn === A ? B : A
    写日志 "轮到 XXX"
  _updateHUD()
```

---

## 📊 消息日志（MessageLog）

| 参数 | 值 |
|------|-----|
| 最大条目数 | 50 |
| 超限处理 | 移除最早条目（`lastChild.remove()`） |
| 时间戳格式 | `zh-CN` locale, HH:MM:SS |
| 插入位置 | `prepend` 到容器顶部（最新在上） |
| 条目类型 | system / reveal / win / warning / error |

---

## 🎲 随机化设计（完整列表）

| 随机项 | 概率/方式 | 时机 | 实现代码 |
|--------|----------|------|----------|
| A/B 规则集交换 | 50% (`Math.random() < 0.5`) | 每次加载关卡 | `_loadLevel()` swapAB |
| A/B 起始位置交换 | 50%（与规则集同步） | 每次加载关卡 | `swapAB ? level.startB : level.startA` |
| 第一回合先手 | 50% A 或 B | 每次加载关卡 | `this.turn = Math.random() < 0.5 ? A : B` |
| 旗帜初始位置 | 从可选空位随机 | 关卡定义时（Levels.js IIFE） | `Math.floor(Math.random() * available.length)` |
| AI BFS 方向顺序 | Fisher-Yates 打乱 | 每次 BFS 寻路 | `_shuffleDirs()` |
| AI 探索方向 | Fisher-Yates 打乱 | 每次探索前沿 | `_shuffleDirs()` |
| AI 脱困方向 | Fisher-Yates 打乱 | 每次 stuck 触发 | `_shuffleDirs()` |
| 旗帜换位目标 | 从候选空位随机 | AI 模式每步 | `_relocateFlag()` |


### Fisher-Yates 洗牌

```javascript
_shuffleDirs(dirs) {
  const arr = [...dirs];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```


---

## 🎨 UI 设计

### 整体布局

```
┌────────────────────────────────────────────────────┐
│                🎭 双盲元谜题 标题栏                   │
├──────┬──────────────────────┬──────────────────────┤
│      │   🔴 玩家A 视角      │                      │
│ 玩家  │  ┌─棋盘A─────────┐  │  📜 消息日志          │
│ 状态  │  └──────────────┘  │                      │
│      │   🔗 共识面板       │  📖 核心规则           │
│ 键位  │  ┌─棋盘B─────────┐  │                      │
│ 说明  │  │ 🔵 玩家B 视角  │  │                      │
│ 图例  │  └──────────────┘  │                      │
├──────┴────────────────────────────────────────────┤
│  [关卡选择] [重置] [AI开始] [AI暂停] [新游戏] [速度] │
└────────────────────────────────────────────────────┘
```

### 面板详解

| 面板 | 位置 | 内容 |
|------|------|------|
| **玩家状态** | 左侧 | A/B 玩家当前位置坐标 + 剩余揭示令牌数 + 彩色圆点标识 |
| **键位说明** | 左侧 | WASD/IJKL 移动键 + Q/U 揭示 + E/O 等待 + Ctrl+Z 撤销，按玩家分组着色 |
| **图例** | 左侧 | 9 种元素的图标说明：迷雾/墙壁/A/B/凯凯/巴巴/旗帜/隐藏规则/未揭示 |
| **双棋盘** | 中央 | 左右并列两个棋盘，分别渲染 A 和 B 的独立视野 |
| **共识面板** | 中央连接区 | 展示双方已揭示的规则（含揭示者、坐标、规则内容；带粒子脉冲连接线） |
| **连接线** | 棋盘之间 | 双线 + 金色/紫色脉冲粒子动画，标签「同一棋盘 · 不同认知」 |
| **关卡信息** | 中央下方 | 关卡名称（金色）+ 描述（灰色）+ 当前回合指示器 |
| **按钮栏** | 中央下方 | 关卡选择 + 重置 + AI开始 + AI暂停/继续 + 新游戏 + 速度控制（4档） |
| **消息日志** | 右侧 | 实时操作日志，含 HH:MM:SS 时间戳，最多 50 条，按类型着色左边框 |
| **核心规则** | 右侧 | 游戏规则简要说明（主观规则、独立视野、轮流行动、揭示令牌、推块、胜利） |

### 开始界面

- 全宽居中卡片，深色径向渐变背景（`radial-gradient` #2c2018 → #1a1510）
- 大标题：「🎭 双盲元谜题」（3.5rem 渐变文字） + 英文副标题
- 中间一行：「同一棋盘，两个视角，完全不同的规则世界」（🔴 🔵 图标夹持）
- 5 个胶囊特性标签：主观规则 / 双视角迷雾 / 轮流行动 / 揭示机制 / 动态旗帜
- 「⚡ 开 始 游 戏」按钮：三色渐变 + hover 放大发光 + active 缩小
- `display: none/block` 控制开始界面与游戏布局的切换（CSS class `hidden`/`visible`）

### 响应式设计

| 断点 | 变化 |
|------|------|
| ≤ 960px | 列布局 → 行布局；双棋盘纵向排列；连接器横向；面板全宽 |
| ≤ 600px | 格子缩小至 22px (`--cell-size`)；标题字号缩小 |

---

## 🎨 UI 色彩体系

### 设计理念

整体采用**暖暗色羊皮纸地牢**风格 —— 模拟古旧地图在烛光下的质感，用低饱和度的暖棕色系打底，A/B 双方分别用暖橙和冷绿区分，金色点缀规则和共识。

### CSS 变量一览

```css
:root {
  /* 背景层级（由深到浅） */
  --bg-primary:    #181310;   /* 页面底色 */
  --bg-secondary:  #221b15;   /* 卡片/面板背景 */
  --bg-tertiary:   #2c231a;   /* 按钮/内嵌元素背景 */

  /* 文字层级 */
  --text-primary:  #e5d8c4;   /* 主文字（暖米白） */
  --text-secondary:#9a8c78;   /* 次要文字（暖灰棕） */
  --text-muted:    #6b5e4c;   /* 禁用/弱化文字 */

  /* 主题强调色 */
  --accent-a:      #c97a4b;   /* 玩家A 暖橙（陶土色） */
  --accent-b:      #7a9b6b;   /* 玩家B 冷绿（苔藓色） */
  --accent-gold:   #d4a030;   /* 规则/共识/旗帜高亮色 */
  --accent-purple: #b8955c;   /* 过渡色（连接线渐变、混合视野） */

  /* 边框 */
  --border-color:  #352c22;   /* 深色分隔线 */
  --border-soft:   rgba(255,255,255,0.05);  /* 柔和半透明边框 */

  /* 网格颜色 */
  --fog-color:     #1a1512;   /* 迷雾（未揭示） */
  --revealed-color:#261f18;   /* 已揭示地板 */
  --wall-color:    #3a3026;   /* 墙壁 */
  --floor-color:   #261f18;   /* 地板 */

  /* 尺寸 */
  --cell-size: 34px;          /* 格子大小 */
  --cell-gap: 2px;            /* 格子间距 */

  /* 圆角胶囊系统 */
  --radius-sm:      10px;
  --radius-md:      16px;
  --radius-lg:      24px;
  --radius-capsule: 50px;     /* 按钮/标签胶囊圆角 */

  /* 阴影 */
  --shadow-card: 0 2px 12px rgba(0,0,0,0.25);
  --shadow-soft: 0 1px 6px rgba(0,0,0,0.18);
}
```

### 颜色使用对照

| UI 元素 | 使用的颜色 |
|---------|-----------|
| 页面背景 | `--bg-primary` #181310 |
| 面板卡片 | `--bg-secondary` #221b15 |
| 按钮默认 | `--bg-tertiary` #2c231a |
| 按钮 primary | `--accent-a` #c97a4b（暖橙） |
| 按钮 secondary | `--accent-b` #7a9b6b（冷绿） |
| 标题渐变 | `--accent-a` → `--accent-purple` → `--accent-b` |
| **开始按钮** | 渐变 `#c97a4b → #b8955c → #7a9b6b` |
| 玩家A 圆点/边框 | `--accent-a` #c97a4b + 发光阴影 |
| 玩家B 圆点/边框 | `--accent-b` #7a9b6b + 发光阴影 |
| A 视角棋盘边框 | `--accent-a` 2px solid |
| B 视角棋盘边框 | `--accent-b` 2px solid |
| 双方共有视野 | `--accent-purple` #b8955c |
| 规则方块（未揭示） | `--accent-purple` 虚线框 + 半透明背景 |
| 规则方块（已揭示） | `--accent-gold` #d4a030 实线框 + 脉冲光晕 |
| 共识面板标题 | `--accent-gold` |
| 连接线粒子 | `--accent-gold` + `--accent-purple` |
| 关卡名称 | `--accent-gold` |
| 胜利 Toast | `--accent-gold` 边框 + 文字 |
| 日志-揭示 | `--accent-gold` 左边框 |
| 日志-胜利 | #44ff44 绿色左边框 |
| 日志-警告 | #ff8844 橙色左边框 |
| 当前回合高亮 | `--accent-gold` 边框 + 金色发光阴影 |
| AI 暂停按钮 | `--accent-a` 暖橙色调 |
| AI 运行按钮 | `--accent-b` 冷绿色调 |

---

## ✨ 动画与视觉效果

| 动画 | 效果 | 触发场景 | CSS 实现 |
|------|------|----------|----------|
| **连接线粒子脉冲** | 金色/紫色粒子沿连接线来回移动 | 常驻，2.5s 循环，两个粒子错峰 1.25s | `@keyframes pulseTravel` left 0→100% |
| **规则方块光晕** | 金色 box-shadow 呼吸脉冲 | 已揭示的规则方块，永久 | `@keyframes ruleGlow` 6px↔16px |
| **悬停联动高亮** | 金色光晕 + 金色内描边 | 鼠标悬停一方棋盘时 | `.cross-highlight` class |
| **日志淡入** | opacity 0→1 + translateY(-4→0) | 新日志条目出现 | `@keyframes fadeIn` 0.2s |
| **胜利 Toast** | translateY(-12→0) + opacity | 玩家通关时 | `@keyframes toastIn` 0.4s |
| **按钮 hover** | translateY(-1px) + 背景变亮 | 鼠标悬停按钮 | `.btn:hover` |
| **按钮 active** | scale(0.97) | 按钮按下 | `.btn:active` |
| **当前回合高亮** | 金色边框 + 金色发光阴影 | 当前回合玩家的棋盘 | `.board-wrapper.active-turn` |
| **鬼影显示** | 半透明对方图标（opacity 0.35） | 迷雾格上有对方玩家时 | `.ghost-a-icon` / `.ghost-b-icon` |

---

## 🎮 操作方式

### 键盘控制

| 功能 | 🔴 玩家A | 🔵 玩家B |
|------|----------|----------|
| 移动（上/下/左/右） | W / S / A / D | I / K / J / L |
| 移动（方向键） | ↑ / ↓ / ← / → | — |
| 揭示规则 | Q | U |
| 等待（跳过回合） | E | O |
| 撤销 | Ctrl+Z（全局） | 同 |

### 按钮操作

| 按钮 | 功能 | 说明 |
|------|------|------|
| ⚡ 开始游戏 | 进入游戏 | 启动 AI 自动对战（默认 1200ms/步） |
| 🤖 AI开始 | 启动 AI | 游戏中途手动开启 AI 自动对战 |
| ⏯ AI 暂停/继续 | 切换 AI | 暂停或恢复 AI 自动对战 |
| 🔄 重置 | 重新开始 | 完全重置当前关卡（重新创建所有对象） |
| 🆕 新游戏 | 返回首页 | 回到开始界面，停止 AI |
| 🐢🐇🚀⚡ | 速度控制 | 4 档速度：2000/1200/600/200 ms |

### AI 模式行为

| 条件 | 行为 |
|------|------|
| AI 运行时手动操作 | 被忽略（日志提示） |
| AI 通关后 | 自动停止，等待手动操作 |
| 重置时 AI 正在运行 | 停止后重建，300ms后自动重启 |
| 调整速度 | 立即生效（下次 `setTimeout` 用新时间） |

---

## 🏗️ 项目架构

```
double-blind-meta-puzzle/
├── index.html               # 入口 HTML + 全部 CSS 样式（~1200行）
├── package.json             # 依赖（仅 vite 5）
├── vite.config.js           # Vite 配置（port 3000）
├── README.md
└── src/
    ├── main.js              # DOMContentLoaded 入口：按钮事件绑定 + AI 初始化
    ├── game/
    │   ├── constants.js     # 枚举常量（PLAYERS, DIRECTIONS, PROPERTIES, ENTITY_TYPES 等）
    │   ├── GameState.js     # 状态管理（网格、玩家、规则、3步记忆、深拷贝 clone）
    │   ├── GameEngine.js    # 碰撞检测与移动逻辑（_checkMove 优先级、推块、胜负判定）
    │   └── Levels.js        # 关卡数据（棋盘生成、实体摆放、旗帜随机、规则集定义）
    ├── ui/
    │   ├── Game.js          # 主控调度（回合管理、AI 对战、旗帜换位、渲染调度、撤销）
    │   ├── BoardRenderer.js # 棋盘渲染（迷雾/实体/规则块/视角边框/悬停联动/鬼影）
    │   ├── RevealSystem.js  # 揭示系统（十字视野揭示 + 规则揭示 + 令牌管理）
    │   ├── MessageLog.js    # 消息日志（时间戳 + 类型着色 + 最多 50 条）
    │   └── InputHandler.js  # 键盘输入（WASD/IJKL + Q/U + E/O + Ctrl+Z + 输入框过滤）
    └── ai/
        └── AIController.js  # AI 决策（揭示→旗帜BFS→迷雾探索→随机脱困→等待）
```

### 核心数据流

```
InputHandler / AIController
        │
        ▼
    Game.js  (主控)
        │
        ├──→ GameState._saveState()      → 保存快照（撤销用）
        ├──→ GameEngine.movePlayer()     → 碰撞/推块/胜负判定
        │   ├── _checkMove()              → STOP > PUSH > WIN 优先级链
        │   ├── _pushEntity()             → 实体移动 + 目标格检查
        │   └── _checkWin()              → 踩旗判定
        ├──→ GameState.recordVisit()     → 记录位置到 playerPath
        ├──→ GameState.recomputeVisibility() → 清空+重算可见格
        ├──→ RevealSystem.revealRule()   → 令牌检查 + 规则入 revealedRules
        ├──→ BoardRenderer.render()      → 双重渲染 A+B 棋盘
        ├──→ Game._updateConsensusPanel() → 更新共识面板
        ├──→ MessageLog.add()            → 写入日志（prepend）
        ├──→ Game._updateHUD()           → 更新位置/令牌/回合指示器
        └──→ Game._advanceTurn()         → movesThisTurn++ / 切换玩家
```

### 对象依赖图

```
Game.js ──────┬── GameState (数据)
              ├── GameEngine (逻辑) ── 依赖 GameState
              ├── BoardRenderer (A) ──── 依赖 GameState + perspective='A'
              │   └── linkSibling ────────→ BoardRenderer (B)
              ├── BoardRenderer (B) ──── 依赖 GameState + perspective='B'
              │   └── linkSibling ────────→ BoardRenderer (A)
              ├── RevealSystem ──────── 依赖 GameState
              ├── MessageLog ─────────── 独立（DOM 操作）
              ├── InputHandler ───────── 独立（键盘事件）
              └── AIController ───────── 依赖 Game（循环引用，通过 game.state）
```

---

## 🚀 运行

```bash
# 安装依赖
npm install

# 开发模式（热更新，默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Vite 5** | 构建工具 + 开发服务器 |
| **Vanilla JavaScript** | 无框架，纯 JS 实现（ES Modules） |
| **CSS Custom Properties** | 主题色系统 + 响应式变量 |
| **CSS Grid** | 棋盘布局 |
| **CSS Animations / Keyframes** | 粒子脉冲、光晕呼吸、淡入过渡 |
| **Flexbox** | 整体页面布局（三栏） |

---

## 📝 设计笔记

1. **双盲**意味着双方不知道对方的规则，只能通过揭示（共享共识面板）来逐步建立共同认知
2. **3 步记忆**防止玩家靠反复移动来绘制完整地图，制造真正的信息不对称——最大可见面积（5格 × 3步）= 15格，而棋盘 99 格，永远看不到全局
3. **动态旗帜**在 AI 模式下防止 AI 一次性找到旗帜后直接路径规划通关，需要持续探索
4. **A/B 互换**保证每次开局体验不同，消除固定位置带来的记忆优势
5. **鬼影机制**让迷雾中的对方位置半透明可见，避免完全盲猜对方在哪——这是「软信息」而非完整信息
6. **悬停联动**是给人工合作的沟通工具 —— 不需要说话也能指路
7. **STOP 优先级最高**的设计保证：即使一个格子上同时有 PUSH 和 STOP 实体，STOP 优先生效，玩家无法踏入
8. **BFS 方向随机打乱**让 AI 行为不可预测，避免每次都走同一条路线
9. **去重处理**出现在多个地方（实体移动、渲染），防止状态不一致导致同一格上有重复的玩家实体
10. **撤销系统保存完整状态克隆**而非操作栈，简化了回滚逻辑但内存开销较大（每个快照是整个棋盘 + 路径 + 规则）
11. **AI 利用已揭示规则更新认知**（`_getEffectiveProperty`）——即使某方自己没揭示，只要对方揭示了规则，AI 也能利用它来规划路径
12. **旗帜换位只发生在 AI 模式**——手动对战模式下旗帜位置保持不变，适合双人策略讨论
