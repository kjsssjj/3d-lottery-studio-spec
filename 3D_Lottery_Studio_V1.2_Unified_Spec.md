# 3D Lottery Studio — 完整产品与技术规范

版本：V1.3 Unified  
基线：V0.2 → V1.0 → V1.1 → V1.2 UI → V1.3 Complete UI  
整合来源：V1.0 Final Spec / V1.0 Production Spec / V1.1 Complete Production Spec / V1.1 UI Contract / V1.2 UI Menu & AssetCenter Full Spec / V1.3 Complete UI Spec（Global / Control 41页 / Display / Assets / Acceptance / Design Tokens / Routing / Components / ViewModels / Forms / Errors）  
定位：大型会议现场级、完全离线、双屏、4K、可审计、可恢复、政务/国企红金风格的专业抽奖运行平台。

---

# 目录

- 第一部分：产品定义与技术栈
- 第二部分：系统架构与目录结构
- 第三部分：核心数据模型
- 第四部分：抽奖算法引擎
- 第五部分：事务与状态机
- 第六部分：双屏通信协议
- 第七部分：崩溃恢复与数据一致性
- 第八部分：导入系统
- 第九部分：头像与资源系统
- 第十部分：纹理图集与 3D 渲染
- 第十一部分：4K 性能预算
- 第十二部分：UI 设计系统
- 第十三部分：菜单与信息架构
- 第十四部分：逐页 UI 契约
- 第十五部分：素材中心高级模块
- 第十六部分：备份、存储与安全
- 第十七部分：现场运营与角色权限
- 第十八部分：4K 大屏视觉规范
- 第十九部分：测试矩阵与验收标准
- 第二十部分：开发阶段与执行指令

---

# 第一部分：产品定义与技术栈

## 1.1 产品定位

本产品是大型单位会议活动使用的专业离线抽奖系统，不是互联网抽奖网站，也不是博彩或娱乐应用。

目标场景：
- 党政机关大型会议
- 国企年会
- 事业单位活动
- 表彰活动
- 年度会议
- 员工大会
- 大型庆典
- 线下抽奖活动

核心能力：
- 100,000+ 人员名单（姓名、工号/编号、单位、部门、头像）
- 多奖项、多轮次
- 完全离线
- 单电脑双屏（控制端 + 4K 3D 大屏）
- 抽奖结果可审计
- 无重复中奖
- 断电/刷新/崩溃后可恢复
- 项目可备份、可迁移、可验证完整性
- 无服务器、无云数据库、无 CDN、无外部 API 依赖

最高优先级：

稳定性 > 数据安全 > 抽奖正确性 > 可审计性 > 双屏同步 > 性能 > 视觉效果 > 花哨动画

## 1.2 强制技术栈

### 保留
- React、TypeScript、Vite
- shadcn/ui、Zustand
- Dexie、IndexedDB
- Web Worker、BroadcastChannel
- Three.js、React Three Fiber、@react-three/drei、@react-three/postprocessing
- xlsx、Web Crypto API、OffscreenCanvas、createImageBitmap

### 可选生产封装
推荐 Tauri 2 或 Electron，仅作为 desktop shell：
- 自动发现第二显示器
- 自动打开 Display 窗口
- 全屏/Kiosk
- 固定本地静态资源
- 崩溃恢复
- 禁止意外导航
- 关闭确认

**关键约束**：抽奖算法、DB 模型、Worker、渲染器不得依赖 shell API。

### 明确禁止
- Node 后端、WebSocket 服务器、Socket.io、Redis、MySQL、PostgreSQL
- 云数据库、在线字体、CDN、第三方分析、在线图片服务
- 在动画代码中放置中奖选择逻辑

## 1.3 V1.0 必须修复的 10 个关键问题

1. 抽奖随机逻辑从"系统随机 + 记录 seed"升级为 **256-bit seed + 确定性随机流 + rejection sampling**
2. 防重复中奖不能只依赖 `participant.status`；必须用 **数据库事务、唯一约束语义和 draw lock**
3. DrawRecord 升级为 **审计记录**，加入 candidateSnapshotHash、seed、algorithmVersion、commitHash、resultHash、transactionId、drawStatus
4. BroadcastChannel 协议加入 sessionId、messageId、sequence、ack、snapshotVersion 和 **幂等处理**
5. "先保存结果再演出"升级为 **两阶段流程**：PREPARED/COMMITTED，再进入动画
6. 项目备份需要 **manifest + schemaVersion + checksum + 原子 staging 导入**
7. 4K 大屏需要明确 **render budget、DPR 上限、GPU 能力检测、资源释放、Texture Atlas 生命周期、Safe Mode**
8. 统一数据模型、状态机、消息协议、模块边界、错误码、验收标准和开发阶段
9. 桌面发行策略：支持纯浏览器模式，正式现场推荐 Tauri/Electron 壳层
10. 测试加入 **故障注入**：断电/刷新/双击/大屏重启/事务失败/存储空间不足/浏览器崩溃

---

# 第二部分：系统架构与目录结构

## 2.1 Monorepo 目录

```
lottery-3d/
├─ apps/
│  ├─ control/        控制端（管理后台 + 现场操作）
│  │  ├─ app/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ features/
│  │  ├─ stores/
│  │  ├─ hooks/
│  │  └─ main.tsx
│  ├─ display/        大屏展示端（4K 3D 演出）
│  │  ├─ app/
│  │  ├─ scenes/
│  │  ├─ render/
│  │  ├─ camera/
│  │  ├─ effects/
│  │  ├─ audio/
│  │  └─ main.tsx
│  └─ verifier/       独立验证器（可选独立应用）
├─ packages/
│  ├─ core/           领域核心
│  │  ├─ domain/
│  │  ├─ lottery/
│  │  ├─ protocol/
│  │  ├─ state-machine/
│  │  ├─ policy/
│  │  ├─ errors/
│  │  └─ constants/
│  ├─ database/       数据层
│  │  ├─ db.ts
│  │  ├─ schema/
│  │  ├─ repositories/
│  │  ├─ transactions/
│  │  ├─ migrations/
│  │  └─ integrity/
│  ├─ workers/        Web Workers
│  │  ├─ lottery.worker.ts
│  │  ├─ import.worker.ts
│  │  ├─ image.worker.ts
│  │  └─ atlas.worker.ts
│  ├─ renderer/       渲染引擎
│  │  ├─ AvatarPool/
│  │  ├─ TextureAtlas/
│  │  ├─ ParticleSystem/
│  │  ├─ CameraDirector/
│  │  ├─ PerformanceGovernor/
│  │  └─ ResourceRegistry/
│  └─ backup/         备份恢复
│     ├─ exportProject.ts
│     ├─ importProject.ts
│     └─ manifest.ts
├─ scripts/
│  ├─ generate-100k.ts
│  ├─ stress-test.ts
│  ├─ verify-randomness.ts
│  └─ verify-backup.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  ├─ stress/
│  └─ fault-injection/
├─ public/
│  ├─ fonts/
│  ├─ textures/
│  ├─ hdr/
│  ├─ sounds/
│  └─ branding/
└─ docs/
   ├─ ARCHITECTURE.md
   ├─ LOTTERY-AUDIT.md
   ├─ DISPLAY-PROTOCOL.md
   ├─ BACKUP-FORMAT.md
   └─ EVENT-RUNBOOK.md
```

## 2.2 五层架构

| 层级 | 职责 | 关键组件 |
|------|------|----------|
| Layer 1 — 数据完整性 | 人员、奖项、资格、版本、快照、备份 | Participant, Prize, Eligibility, Revision, Snapshot, Backup |
| Layer 2 — 抽奖完整性 | 种子、确定性随机、无偏采样、候选快照、Draw Lock、原子事务、审计哈希 | Seed, DRNG, Rejection Sampling, CandidateSnapshot, DrawLock, AtomicTx, AuditHash |
| Layer 3 — 运行可靠性 | 状态机、Worker、Session、恢复、健康、检查点 | StateMachine, Worker, Session, Recovery, Health, Checkpoint |
| Layer 4 — 展示可靠性 | 广播协议、大屏同步、WebGL、GPU、Atlas、LOD、音频、性能治理 | BroadcastProtocol, DisplaySync, WebGL, GPU, Atlas, LOD, Audio, PerfGovernor |
| Layer 5 — 现场运营 | 演练、事件锁、角色、现场模式、Runbook、审计包、验证器、桌面壳层 | DryRun, EventLock, Roles, EventMode, Runbook, AuditPackage, Verifier, DesktopShell |

## 2.3 14 大模块

01 项目管理器、02 人员管理器、03 奖项管理器、04 资格引擎、05 抽奖引擎、06 审计与验证、07 数据库与事务、08 导入与资产引擎、09 备份与恢复、10 通信引擎、11 展示引擎、12 性能与健康、13 现场运营、14 桌面运行时

---

# 第三部分：核心数据模型

## 3.1 Participant

```ts
type ParticipantStatus = "eligible" | "winner" | "disabled";

interface Participant {
  id: string;
  employeeNo?: string;
  name: string;
  organization?: string;
  department?: string;
  avatarId?: string;
  avatarAssetHash?: string;
  status: ParticipantStatus;
  winnerDrawId?: string;
  dataVersion?: number;
  createdAt: number;
  updatedAt: number;
}
```

关键规则：
- `status` 是 **查询加速字段**，不是唯一防重复机制
- `winnerDrawId` 用于数据一致性校验
- ID 必须稳定，不得使用数组索引

## 3.2 Prize

```ts
interface Prize {
  id: string;
  name: string;
  totalCount: number;
  remainingCount: number;
  order: number;
  enabled: boolean;
  allowPreviousWinners: boolean;  // 默认 false
  animationPreset: "ceremony" | "gold" | "classic" | "honor";
  eligibilityRuleId?: string;
  sceneTemplateId?: string;
  winnerCardTemplateId?: string;
  prizeAssetId?: string;
  createdAt: number;
  updatedAt: number;
}
```

## 3.3 PrizeBatch（批次）

```ts
interface PrizeBatch {
  id: string;
  prizeId: string;
  batchNumber: number;
  plannedCount: number;
  drawnCount: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VOIDED";
  createdAt: number;
  updatedAt: number;
}
```

## 3.4 DrawRecord（审计级抽奖记录）

```ts
type DrawStatus = "PREPARED" | "COMMITTED" | "PRESENTING" | "FINISHED" | "ABORTED";

interface DrawRecord {
  id: string;
  transactionId: string;
  projectId: string;
  prizeId: string;
  batchId?: string;
  winnerIds: string[];
  candidateCount: number;
  drawCount: number;
  seedHex: string;
  algorithmVersion: string;
  candidateSnapshotHash: string;
  resultHash: string;
  commitHash: string;
  projectSnapshotHash?: string;
  projectRevision?: number;
  participantsRevision?: number;
  prizesRevision?: number;
  settingsRevision?: number;
  eligibilityRevision?: number;
  sequence: number;
  status: DrawStatus;
  eventMode: "LIVE" | "DRY_RUN";
  createdAt: number;
  committedAt?: number;
  finishedAt?: number;
  presentationPreset: string;
  appVersion: string;
  buildId?: string;
  wallClockTime: number;
  timezoneOffsetMinutes: number;
  monotonicDurationMs?: number;
}
```

## 3.5 SessionState

```ts
interface SessionState {
  id: string;
  projectId: string;
  currentPrizeId?: string;
  currentDrawId?: string;
  phase: LotteryPhase;
  lastSequence: number;
  displaySessionId?: string;
  cleanShutdown: boolean;
  updatedAt: number;
}
```

## 3.6 OperationLog

```ts
type OperationType =
  | "PROJECT_CREATE" | "PROJECT_OPEN" | "PROJECT_PUBLISH"
  | "EVENT_LOCK" | "EVENT_UNLOCK"
  | "IMPORT_START" | "IMPORT_FINISH"
  | "PRIZE_CHANGE" | "ELIGIBILITY_CHANGE"
  | "DRAW_PRECHECK" | "DRAW_PREPARE" | "DRAW_COMMIT" | "DRAW_FINISH"
  | "EMERGENCY_STOP" | "REPLAY"
  | "BACKUP_EXPORT" | "BACKUP_IMPORT"
  | "EVENT_START" | "EVENT_END";

interface OperationLog {
  id: string;
  type: OperationType;
  userId?: string;
  drawId?: string;
  payloadHash?: string;
  timestamp: number;
}
```

追加语义，普通 Operator 不可删除。

## 3.7 DrawLock

```ts
interface DrawLock {
  id: "GLOBAL_DRAW_LOCK";
  token: string;
  ownerSessionId: string;
  acquiredAt: number;
  expiresAt: number;
}
```

有效锁存在时，阻止一切新抽奖。双击、键盘重复、重复页面事件均无法产生第二个结果。

## 3.8 EligibilityRule

```ts
type EligibilityRuleType =
  | "NOT_PREVIOUS_WINNER"
  | "INCLUDE_DEPARTMENT" | "EXCLUDE_DEPARTMENT"
  | "INCLUDE_PARTICIPANT" | "EXCLUDE_PARTICIPANT"
  | "TAG" | "CUSTOM_STATIC_LIST";

interface EligibilityRule {
  id: string;
  name: string;
  type: EligibilityRuleType;
  enabled: boolean;
  config: unknown;
  order: number;
  revision?: number;
  createdAt: number;
  updatedAt: number;
}
```

## 3.9 Revision 系统

```ts
interface ProjectRevision {
  id: string;
  projectId: string;
  revision: number;
  participantRevision: number;
  prizeRevision: number;
  settingsRevision: number;
  eligibilityRevision: number;
  snapshotHash: string;
  publishedAt: number;
  publishedBy: string;
  status: "DRAFT" | "PUBLISHED" | "LOCKED";
}
```

每条 DrawRecord 绑定具体 revision。历史 DrawRecord 不自动跟随最新数据。

## 3.10 RuntimeCheckpoint

```ts
interface RuntimeCheckpoint {
  id: string;
  projectId: string;
  lastCommittedDrawId: string;
  drawCount: number;
  winnerCount: number;
  projectRevision: number;
  databaseStateHash: string;
  timestamp: number;
}
```

每次正式 COMMIT 后写入。启动时对比 IndexedDB 状态与最后检查点，不一致则进入完整性恢复。

## 3.11 BuildInfo

```ts
interface BuildInfo {
  appVersion: string;
  buildId: string;
  gitCommit?: string;
  buildTimestamp: number;
  schemaVersion: number;
  rendererVersion: string;
  lotteryEngineVersion: string;
  buildHash?: string;
}
```

## 3.12 Event

```ts
interface Event {
  id: string;
  projectId: string;
  name: string;
  mode: "LIVE" | "DRY_RUN";
  status: "DRAFT" | "RUNNING" | "ENDED";
  revision: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

## 3.13 IndexedDB / Dexie 数据库

**表**：projects, participants, prizes, prizeBatches, draws, assets, sessions, operationLogs, settings, importJobs, eligibilityRules, events, projectRevisions, checkpoints

**索引**：
- participants: `"id, employeeNo, name, department, status, winnerDrawId"`
- prizes: `"id, order, enabled"`
- draws: `"id, transactionId, prizeId, status, createdAt, sequence"`
- sessions: `"id, projectId, updatedAt"`
- operationLogs: `"id, type, drawId, timestamp"`
- assets: `"id, participantId, kind, hash"`

必须使用 schema version + migration。导入/恢复/抽奖提交不得 delete-then-write。
---

# 第四部分：抽奖算法引擎

## 4.1 目标

高质量随机源、无偏采样、无重复、可审计、可复现、完全与动画解耦、事务一致性、双击幂等、崩溃可恢复。

## 4.2 种子

每轮使用 256-bit 种子：

```ts
const seedBytes = crypto.getRandomValues(new Uint8Array(32));
const seedHex = Array.from(seedBytes).map(b => b.toString(16).padStart(2, "0")).join("");
```

注意：Web Crypto 的系统随机源不可由应用层设定 seed。

## 4.3 确定性随机流

使用 seed 作为 HMAC-SHA-256 密钥，计数器模式：

```
block_0 = HMAC-SHA256(seed, "LOTTERY_V1" || drawId || 0)
block_1 = HMAC-SHA256(seed, "LOTTERY_V1" || drawId || 1)
...
```

相同 seed + drawId + algorithmVersion **必须**产生完全相同的随机流。

**禁止使用 `Math.random()`。**

## 4.4 无偏整数（Rejection Sampling）

```ts
function unbiasedIndex(nextUint32: () => number, maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("INVALID_BOUND");
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  while (true) {
    const value = nextUint32();
    if (value < limit) return value % maxExclusive;
  }
}
```

禁止使用 `randomUint32 % max`（模偏）。

## 4.5 候选池（Swap-and-Pop）

```ts
class CandidatePool {
  private ids: string[];

  constructor(ids: string[]) {
    this.ids = [...ids];
  }

  drawOne(index: number): string {
    const last = this.ids.length - 1;
    const winner = this.ids[index];
    this.ids[index] = this.ids[last];
    this.ids.pop();
    return winner;
  }

  get remaining(): number {
    return this.ids.length;
  }
}
```

## 4.6 完整抽奖流程

1. 从 IndexedDB 读取候选 ID
2. 规范排序（稳定排序保证可复现）
3. 计算 `candidateSnapshotHash`
4. 初始化确定性随机流
5. 每次抽取生成无偏索引
6. Swap-and-pop
7. 获得 winnerIds
8. 计算 `resultHash`
9. 进入数据库事务提交

## 4.7 候选快照哈希

规范格式：排序后的 participant ID，每行一个，然后 `SHA256(canonicalCandidateIds)`。

验证要求：相同 candidateCount + 相同 snapshotHash + 相同 seed + 相同 algorithmVersion。

## 4.8 提交哈希

```
commitHash = SHA256(drawId + prizeId + candidateSnapshotHash + seedHex + algorithmVersion + resultHash)
```

用途：检测 DrawRecord 关键字段被意外修改。

## 4.9 算法版本冻结

算法 ID 不可变。示例：`lottery-hmac-sha256-rejection-swap-pop-v1`。  
未来：`...-v2`。  
禁止：`latest`、`current`、`default`。  
旧 DrawRecord 必须始终可由其对应版本重新计算。

## 4.10 资格引擎

独立于 LotteryEngine。

流程：已发布人员 → 资格规则 → 候选解析器 → 规范候选 ID → 候选快照哈希 → 抽奖引擎。

资格在随机采样 **之前** 确定。规则不能在随机过程中动态变化。

---

# 第五部分：事务与状态机

## 5.1 原子提交

单个 Dexie 事务跨 `participants, prizes, draws, sessions, operationLogs`：

1. 重新验证候选状态
2. 创建 DrawRecord(COMMITTED)
3. 设置中奖者 `participant.status = "winner"`
4. 设置 `winnerDrawId = drawId`
5. 递减 `prize.remainingCount -= drawCount`
6. 设置 `session.currentDrawId = drawId`
7. 追加操作日志

**失败规则**：不允许任何部分效果。无 DrawRecord 则无中奖者标记；无中奖者标记则无 DrawRecord。

## 5.2 DB 约束语义

IndexedDB 缺乏 SQL UNIQUE WHERE，一致性通过以下方式保证：
- 全局 draw lock
- 事务内重新读取 participant status
- winnerDrawId 绑定
- 唯一 DrawRecord ID/transactionId
- 启动时一致性检查
- 幂等提交

## 5.3 幂等性

每次抽奖预先生成 `transactionId`。如果相同 transactionId 已有 COMMITTED 记录，立即返回原始结果。**绝不重新随机化。**

## 5.4 两阶段抽奖流程

六个阶段：PRECHECK → PREPARE → COMPUTE → COMMIT → PRESENT → FINISH

| 阶段 | 动作 |
|------|------|
| PRECHECK | 大屏已连接、DB 健康、Worker 就绪、Renderer 就绪、candidateCount >= drawCount、未在导入、无活跃 draw lock |
| PREPARE | 生成 drawId、transactionId，获取 draw lock，快照候选，生成种子，计算哈希 |
| COMPUTE | 确定性随机流，无偏选择，winnerIds |
| COMMIT | Dexie 事务，持久化 draw，标记中奖者，更新 prize，更新 session |
| PRESENT | 发送 DRAW_COMMITTED，大屏播放动画，仅展示已提交的中奖者 |
| FINISH | draw.status = FINISHED，session phase = IDLE，释放 draw lock |

**关键原则**：在 DB 提交成功之前，大屏不得进入"中奖者展示"。

## 5.5 状态机

```ts
type LotteryPhase =
  | "IDLE" | "PRECHECK" | "PREPARING" | "COMMITTING"
  | "ROLLING" | "SLOWING" | "REVEALING" | "CELEBRATION"
  | "FINISHED" | "STOPPED" | "ERROR";
```

允许转换：
- IDLE → PRECHECK → PREPARING → COMMITTING → ROLLING → SLOWING → REVEALING → CELEBRATION → FINISHED → IDLE
- 任何展示状态 → STOPPED
- DB 失败 → ERROR

明确禁止：
- IDLE → REVEALING
- ROLLING → COMMITTING
- FINISHED → ROLLING

## 5.6 运行态模式

```ts
type RuntimeMode = "NORMAL" | "DRY_RUN" | "LIVE" | "MAINTENANCE";
```

| 模式 | 行为 |
|------|------|
| NORMAL | 正常编辑与准备 |
| DRY_RUN | 独立 DrawRecord 类型，不修改 participant.status，不写 winnerDrawId，不减少 remainingCount，大屏显示"演练模式"水印 |
| LIVE | 正式抽奖，编辑型操作冻结 |
| MAINTENANCE | 仅开放诊断/恢复类入口 |

LIVE 与 DRY_RUN 的 session/draw/audit 数据必须可区分。

---

# 第六部分：双屏通信协议

## 6.1 通道

`lottery_3d_channel_v1`

## 6.2 信封

```ts
interface Envelope<T> {
  protocolVersion: 1;
  sessionId: string;
  messageId: string;
  sequence: number;
  timestamp: number;
  type: string;
  payload: T;
}
```

## 6.3 消息类型

DISPLAY_READY, DISPLAY_HEARTBEAT, DISPLAY_CAPABILITIES, CONTROL_HELLO, SYNC_REQUEST, SYNC_SNAPSHOT, DRAW_PREPARE, DRAW_COMMITTED, DRAW_PRESENT, DRAW_FINISH, REPLAY, EMERGENCY_STOP, RESET, ACK, ERROR

## 6.4 幂等

Display 跟踪 `lastProcessedSequence` 和 `seenMessageIds`。忽略 sequence <= lastProcessedSequence 或已见过的 messageId。

## 6.5 心跳

- Display 每 **2 秒**发送心跳
- **5 秒**无心跳：显示"连接异常"
- **10 秒**无心跳：视为断开
- 恢复后 Display 发送 SYNC_REQUEST；Control 返回完整 SYNC_SNAPSHOT（非仅最后消息）

## 6.6 DisplaySnapshot

```ts
interface DisplaySnapshot {
  projectId: string;
  currentPrizeId?: string;
  currentDrawId?: string;
  drawStatus?: DrawStatus;
  phase: LotteryPhase;
  winnerIds: string[];
  presentationPreset?: string;
  snapshotVersion: number;
}
```

---

# 第七部分：崩溃恢复与数据一致性

## 7.1 Control 刷新恢复

启动序列：打开 DB → schema 迁移 → 读取 session → 检查 `cleanShutdown` → 检查未完成的 COMMITTED/PRESENTING DrawRecord → 一致性检查 → 恢复当前轮次 → 与 Display 重新同步

## 7.2 Display 重启

Display 不存储抽奖逻辑。重启后：DISPLAY_READY → SYNC_REQUEST → SYNC_SNAPSHOT → 恢复状态。如果 draw 已 COMMITTED：恢复 winnerIds，可选继续动画或显示"结果已产生"。**绝不重新随机化。**

## 7.3 紧急停止

只能停止：动画、粒子、音频、相机时间线。  
**不能回滚**：已提交的 winnerIds、DrawRecord、participant 中奖状态。

## 7.4 重播

从 DrawRecord 只读。禁止：重建种子、重新采样、更改中奖者。

## 7.5 数据一致性检查

启动自检清单（8 项）：
1. 每个中奖 participant 有 winnerDrawId
2. 每个 winnerDrawId 有对应 DrawRecord
3. DrawRecord winnerIds 与 participant 匹配
4. 无 participant 出现在多个不可重复中奖的 DrawRecord 中
5. prize.remainingCount 非负
6. candidateSnapshotHash 格式有效
7. resultHash / commitHash 可重新计算
8. session.currentDrawId 指向有效 DrawRecord

异常处理：不自动猜测修复。进入维护模式，提供诊断报告，允许备份恢复。

## 7.6 WebGL 上下文恢复

监听 `webglcontextlost` / `webglcontextrestored`。

恢复流程：Context Lost → 暂停展示时间线 → 记录当前 Phase → 重建 Renderer → 恢复 Atlas/Texture → 恢复 Camera/Scene 状态 → 继续展示已 COMMITTED 的 Draw。

**绝对禁止重新抽奖。**

## 7.7 时间模型

```ts
wallClockTime: number;
timezoneOffsetMinutes: number;
monotonicDurationMs?: number;
```

审计时间 = 系统挂钟。动画时长 = performance.now()。超时/心跳优先使用单调时钟。防止系统时钟跳变影响动画和连接判断。
---

# 第八部分：导入系统

## 8.1 支持格式

.xlsx、.xls、.csv

## 8.2 标准列

编号、姓名、单位、部门、头像文件名

## 8.3 8 步导入流程

1. 选择文件
2. 字段映射
3. 数据校验
4. 重复检测
5. 头像匹配
6. 预览
7. Staging（暂存）
8. Commit（提交）

## 8.4 管道

选择文件 → Worker 解析 → 列映射 → 数据规范化 → 重复检测 → 头像匹配 → 预览 → 确认 → Staging → 事务 bulkPut → 验证 → 完成

## 8.5 禁止

- 在主线程解析 100k Excel
- 一行一事务
- 失败时留下半截导入数据

## 8.6 导入报告字段

总记录数、有效、重复、缺姓名、缺编号、头像缺失、可导入、跳过、失败、耗时、平均速度

## 8.7 导入任务状态

```ts
type ImportJobStatus = "PENDING" | "PARSING" | "VALIDATING" | "STAGING" | "COMMITTING" | "COMPLETED" | "FAILED" | "CANCELLED";
```

---

# 第九部分：头像与资源系统

## 9.1 核心原则

100,000 原始头像是 **数据资产**，**绝不全部上传到 GPU**。

## 9.2 处理管道

原始图 → createImageBitmap → OffscreenCanvas → 裁剪 → 64/128/256/512 → WebP → IndexedDB

## 9.3 必须释放

bitmap.close()、texture.dispose()、material.dispose()、geometry.dispose()、renderTarget.dispose()、清理 requestAnimationFrame、清理事件监听器

## 9.4 AvatarAssetManager

方法：get、prefetch、release、clear、has

## 9.5 缓存策略

LRU，显式 maxEntries / maxApproxBytes。
- 中奖者特写 = 高优先级
- 滚动头像优先 128/256
- **512 仅用于中奖展示**

## 9.6 内容寻址资产存储

头像资源使用 `SHA256(image bytes)` 作为 asset hash。

```ts
interface AvatarAsset {
  hash: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  variants: { size: 64 | 128 | 256 | 512; blob: Blob }[];
}
```

Participant 存储 `avatarAssetHash?: string`。

好处：图片去重、完整性验证、备份去重、atlas 重建、损坏检测。

## 9.7 头像隐私

设置项：待机阶段头像展示、滚动阶段头像展示、展示阶段头像展示、控制端名单头像展示、控制端默认头像模糊。

导出 Winners CSV 默认排除：本地绝对路径、原始图片文件、内部资产存储路径。

---

# 第十部分：纹理图集与 3D 渲染

## 10.1 纹理图集（从"建议"升级为"必须实现"）

- 2048 或 4096 atlas 尺寸
- 每个 atlas 固定 cell 大小
- Atlas 页有版本号
- 实例仅记录 atlasIndex + uvRect
- Atlas 页数受 GPU 显存预算限制
- Atlas 生成在 Worker / OffscreenCanvas
- 项目切换时完全释放

**降级方案**：如果动态大 atlas 在某些浏览器/GPU 不稳定，降级为小批量纹理数组/批处理材质。**绝不回到 1000 个 React `<img>` 或 1000 个独立材质。**

## 10.2 3D 渲染架构

渲染器对抽奖算法一无所知。

结构：DisplayApp → SceneManager, AvatarUniverse, CameraDirector, ParticleManager, WinnerReveal, CelebrationSystem, AudioManager, PerformanceGovernor, ResourceRegistry

## 10.3 AvatarUniverse

100,000 候选总数，但同时仅 **300-1,000** 个可视化：
- 确定性视觉采样
- InstancedMesh
- Fibonacci 球面 / 黄金螺旋
- 视锥剔除
- LOD
- Atlas UV

**关键规则**：视觉上滚动的人不代表中奖概率，也不是抽奖候选源。

---

# 第十一部分：4K 性能预算

## 11.1 FPS 目标

| 分辨率 | 目标 FPS |
|--------|----------|
| 1080p | 60 |
| 1440p | 60 |
| 4K | 目标 60，安全底线 30 |

4K 60 不是绝对保证。

## 11.2 性能等级

ULTRA、HIGH、MEDIUM、SAFE。默认：HIGH。

## 11.3 HIGH 预算

| 参数 | 值 |
|------|-----|
| DPR 上限 | 1.5 |
| 可见头像 | 600 |
| 粒子 | 8k-15k |
| Bloom | 开 |
| DOF | 默认关 |
| 色差 | 关 |
| 阴影 | 最小 |

## 11.4 SAFE 预算

| 参数 | 值 |
|------|-----|
| DPR | 1.0 |
| 可见头像 | 250-350 |
| 粒子 | ≤ 3k |
| Bloom | 仅基础 |
| DOF | 关 |
| 体积光 | 关 |

## 11.5 PerformanceGovernor

使用 **移动平均 FPS**（非单帧）：
- 10 秒平均 FPS < **50** → 降一级
- 10 秒平均 FPS < **35** → SAFE
- 连续 30 秒 FPS > **58** → 允许升一级

防止阈值附近振荡。

---

# 第十二部分：UI 设计系统

## 12.1 Control Shell 布局

```
┌────────────────────────────────────────────────────────────────────┐
│ 顶部状态栏 Header                                                  │
├───────────────┬────────────────────────────────────────────────────┤
│ 左侧菜单栏     │ 页面内容区                                         │
│ 220-236px      │                                                    │
│               │                                                    │
├───────────────┴────────────────────────────────────────────────────┤
│ 底部状态条：版本 / 数据库 / 自动保存 / Build / 当前项目             │
└────────────────────────────────────────────────────────────────────┘
```

## 12.2 顶部全局状态栏

任何业务页固定展示：

```
活动名称
项目：LOCKED / UNLOCKED
模式：LIVE / DRY_RUN / NORMAL
系统：READY / DEGRADED / BLOCKED
大屏：CONNECTED / DISCONNECTED
自动保存：OK / ERROR
当前角色
当前时间
```

示例：
```
集团2026年度会议 | 项目：已锁定 | 模式：LIVE
● SYSTEM READY  ● 大屏已连接  ● 自动保存正常
管理员 ▼
```

状态栏不可由页面自行实现不同版本。

## 12.3 色彩系统

### 基础色

| 名称 | 色值 |
|------|------|
| 主红 | #C8102E |
| 深红 | #8F1028 |
| 金色 | #D4A94A |
| 浅金 | #F2D27A |
| 页面背景 | #F4F5F7 |
| 卡片 | #FFFFFF |
| 主文字 | #1F2937 |
| 次文字 | #667085 |
| 边框 | #E1E5EA |
| 成功 | #16865C |
| 警告 | #C27803 |
| 危险 | #B42318 |
| 信息 | #2563EB |

### CSS 变量（Design Tokens）

```css
--red-900: #6F0F1F;  --red-800: #8F1028;  --red-700: #A9132D;  --red-600: #C8102E;
--gold-700: #A9822E;  --gold-600: #C49A3A;  --gold-500: #D4A94A;  --gold-300: #E9CF8B;
--bg: #F4F5F7;  --panel: #FFFFFF;  --text: #1F2937;  --muted: #667085;  --border: #E1E5EA;
--ok: #16865C;  --warn: #C27803;  --danger: #B42318;  --info: #2563EB;
```

## 12.4 组件规则

- 圆角 4-8px（禁止 16-24px 到处用）
- 主按钮中国红
- 次按钮白底灰边
- 危险按钮深红
- 状态不可只使用颜色，必须配文字
- 卡片不使用强玻璃拟态
- 阴影极轻

## 12.5 视觉原则

关键词：庄重、可信、简洁、 robust、仪式感、高信息密度不拥挤。

禁止：电竞蓝紫霓虹、赌博感、赌场风格、过度玻璃拟态、高饱和渐变填充页面、夸张圆角、SaaS 营销页风格。

## 12.6 全局状态颜色

| 状态 | UI 表现 |
|------|---------|
| READY | 绿色 + 文字 |
| DEGRADED | 橙色 + 文字 |
| BLOCKED | 红色 + 文字 |
| LIVE | 中国红 + LIVE |
| DRY RUN | 金色/橙色 + DRY RUN |
| ARCHIVED | 灰色 |

## 12.7 统一页面状态

每个页面必须覆盖：

### Empty
图标 + 标题 + 一句说明 + 主要行动按钮 + 次行动按钮（可选）

### Loading
禁止整页空白。Skeleton Header + Skeleton KPI + Skeleton Table/Grid + "正在加载..."状态

### Error
发生了什么 + 影响范围 + 是否影响正式抽奖 + 重试 + 查看诊断

### Blocked
当前操作已阻止 + 原因 + 需要完成的前置条件 + 前往解决按钮

### LIVE
红色/金色顶部细条 + "正式活动进行中" + 禁止编辑型操作 + 只保留运行型操作

## 12.8 页面标准模板

```
Header
├─ Title
├─ Description
├─ Status badges
└─ Page actions

KPI Area（可选）

Filter / Toolbar

Main Content

Right Detail Drawer / Side Panel（可选）

Footer / Pagination / Health Hint
```

## 12.9 Design Tokens 补充

| Token | 值 | 说明 |
|-------|------|------|
| Sidebar 宽度 | 220-236px | 菜单侧栏 |
| Inspector 宽度 | 360 / 400 / 440px | 右侧面板三档 |
| Radius | 4 / 6 / 8px | 禁止 16-24px 到处用 |
| 状态标识 | 颜色 + 文字 | 不可只使用颜色 |

## 12.10 全局 UiCapabilities 定义

页面只能消费 `UiCapabilities`，不允许重新拼装规则。

```ts
type Role = "OPERATOR" | "ADMINISTRATOR";
type RuntimeMode = "NORMAL" | "DRY_RUN" | "LIVE" | "MAINTENANCE";
type SystemHealth = "READY" | "DEGRADED" | "BLOCKED";

interface UiPolicyContext {
  role: Role;
  runtimeMode: RuntimeMode;
  projectState: string;
  eventState?: string;
  systemHealth: SystemHealth;
  displayConnected: boolean;
  drawLockActive: boolean;
  storageBlocked: boolean;
  maintenanceMode: boolean;
}

interface UiCapabilities {
  // 抽奖
  canDraw: boolean;
  canReplay: boolean;
  canEmergencyStop: boolean;
  canVoidDraw: boolean;
  // 人员
  canEditParticipants: boolean;
  canImport: boolean;
  canDisableParticipant: boolean;
  // 奖项
  canEditPrizes: boolean;
  canEditEligibility: boolean;
  canEditBatches: boolean;
  // 素材
  canManageAssets: boolean;
  canEditScenes: boolean;
  canEditThemes: boolean;
  canEditAnimations: boolean;
  // 数据
  canRestoreBackup: boolean;
  canExportData: boolean;
  canCleanStorage: boolean;
  // 系统
  canEnterLive: boolean;
  canExitLive: boolean;
  canManageUsers: boolean;
  canEditSettings: boolean;
  canRunDiagnostics: boolean;
  // 项目
  canPublishProject: boolean;
  canLockProject: boolean;
  canArchiveProject: boolean;
  canManageRevisions: boolean;
}
```

### UiCapabilities 完整矩阵

| Capability | LIVE+READY | LIVE+DEGRADED | LIVE+BLOCKED | DRY_RUN | NORMAL | MAINTENANCE | 权限不足 |
|---|---|---|---|---|---|---|---|
| canDraw | ✓(Op+Admin) | ✕ | ✕ | ✓(Admin) | ✕ | ✕ | ✕ |
| canReplay | ✓(Op+Admin) | ✓(Op+Admin) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEmergencyStop | ✓(Op+Admin) | ✓(Op+Admin) | ✓(Admin) | ✓(Admin) | ✕ | ✕ | ✕ |
| canVoidDraw | ✓(Admin) | ✓(Admin) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditParticipants | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canImport | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canDisableParticipant | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditPrizes | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditEligibility | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditBatches | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canManageAssets | ✕(只读) | ✕(只读) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditScenes | ✕(只读) | ✕(只读) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditThemes | ✕(只读) | ✕(只读) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEditAnimations | ✕(只读) | ✕(只读) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canRestoreBackup | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canExportData | ✓(Admin) | ✓(Admin) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canCleanStorage | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canEnterLive | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canExitLive | ✓(Admin) | ✓(Admin) | ✓(Admin) | ✕ | ✕ | ✕ | ✕ |
| canManageUsers | ✕ | ✕ | ✕ | ✕ | ✓(Admin) | ✕ | ✕ |
| canEditSettings | ✕(部分) | ✕(部分) | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canRunDiagnostics | ✓(Admin) | ✓(Admin) | ✓(Admin) | ✓(Admin) | ✓(Admin) | ✓(Admin) | ✕ |
| canPublishProject | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canLockProject | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |
| canArchiveProject | ✕ | ✕ | ✕ | ✕ | ✓(Admin) | ✕ | ✕ |
| canManageRevisions | ✕ | ✕ | ✕ | ✓(Admin) | ✓(Admin) | ✕ | ✕ |

## 12.11 页面状态矩阵

每个页面必须覆盖以下 8 种状态：

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| Normal | 数据正常 | 标准页面布局 |
| Loading | 数据加载中 | Skeleton Header + KPI + Table，禁止整页空白 |
| Empty | 无数据 | 图标 + 标题 + 说明 + CTA 按钮 |
| Error | 读取/操作失败 | 错误标题 + 影响范围 + 是否影响抽奖 + 重试 + 诊断 |
| Blocked | SystemHealth=BLOCKED | 阻塞原因 + 前置条件 + 前往解决 |
| LIVE | RuntimeMode=LIVE | 红色/金色顶部细条 + 禁止编辑型操作 |
| DRY_RUN | RuntimeMode=DRY_RUN | 右上固定"演练模式 DRY RUN"水印 |
| Maintenance | RuntimeMode=MAINTENANCE | 维护模式提示 + 限制操作 |
| PermissionDenied | 角色不足 | 拦截提示 + 返回安全页 |

## 12.12 组件 Props 契约

### PageHeaderProps
```ts
interface PageHeaderProps {
  title: string;
  description?: string;
  badges?: StatusBadge[];
  actions: ActionConfig[];
}
```

### KpiGridProps
```ts
interface KpiGridProps {
  items: { label: string; value: string | number; trend?: "up" | "down" | "flat"; status?: "ok" | "warn" | "danger" }[];
}
```

### FilterBarProps
```ts
interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
}
```

### DataTableProps / VirtualDataTableProps
```ts
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  sorting: SortingState;
  onSortingChange: (s: SortingState) => void;
  selection?: SelectionState;
  onSelectionChange?: (s: SelectionState) => void;
  loading?: boolean;
  empty?: React.ReactNode;
}

// 记录 > 5000 时必须使用 VirtualDataTable
interface VirtualDataTableProps<T> extends DataTableProps<T> {
  rowHeight: number;
  overscan?: number;
  totalRows: number;
}
```

### ColumnDef
```ts
interface ColumnDef<T> {
  field: keyof T;
  label: string;
  width: number;
  sortable: boolean;
  filterable: boolean;
  filterOperators?: ("equals" | "contains" | "in" | "between")[];
  fixed?: "left" | "right";
  defaultVisible: boolean;
}
```

### RightInspectorProps
```ts
interface RightInspectorProps {
  title: string;
  summary: InspectorSummary;
  sections: InspectorSection[];
  actions: ActionConfig[];
  width?: 360 | 400 | 440;
}
```

### ActionConfig
```ts
interface ActionConfig {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  testId: string;
}
```

### EmptyStateProps
```ts
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
}
```

### LoadingStateProps
```ts
interface LoadingStateProps {
  phases: string[];
  currentPhase: number;
  showSkeleton?: "table" | "grid" | "form";
}
```

### ErrorStateProps
```ts
interface ErrorStateProps {
  errorCode: string;
  title: string;
  impact: string;
  affectsDraw: boolean;
  retryAction?: ActionConfig;
  diagnoseAction?: ActionConfig;
}
```

### DangerDialogProps
```ts
interface DangerDialogProps {
  open: boolean;
  title: string;
  impactDescription: string;
  reversibility: "irreversible" | "recoverable" | "partial";
  affectedObjects: { type: string; id: string; label: string }[];
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
```

## 12.13 共享组件清单

| 组件 | 用途 |
|------|------|
| PageHeader | 页面标题/描述/徽章/操作 |
| StatusStrip | 顶部全局状态栏 |
| KpiGrid | KPI 指标网格 |
| FilterBar | 筛选器栏 |
| DataTable | 标准数据表格 |
| VirtualDataTable | 虚拟化大数据表格（>5000行） |
| AssetGrid | 素材网格视图 |
| RightInspector | 右侧详情面板 |
| EmptyState | 空状态 |
| LoadingState | 加载状态（含阶段） |
| ErrorState | 错误状态 |
| BlockedState | 阻塞状态 |
| ConfirmDialog | 普通确认弹窗 |
| DangerDialog | 危险操作确认弹窗 |
| LiveLockBanner | LIVE 锁定横幅 |
| GlobalStatusBar | 全局状态条 |
| StatusBadge | 状态徽章 |
| PageGuard | 页面权限守卫 |
| RouteGuard | 路由权限守卫 |
| KeyboardShortcut | 键盘快捷键 |
| PhaseProgress | 阶段进度条 |
| InspectorTab | Inspector 标签页 |
| ActionButton | 操作按钮 |
| SearchInput | 搜索输入框 |

## 12.14 DataTable / VirtualDataTable 契约

- 固定表头
- 列显隐切换
- 列宽可调
- 排序（单列/多列）
- 筛选（操作符必须匹配 ColumnDef.filterOperators）
- 批量选择
- 虚拟滚动（>5000 行必须使用 VirtualDataTable）
- 导出当前筛选结果
- 100k 页面不允许普通完整 DOM 表格

## 12.15 Loading Phases 契约

每个页面必须声明专属 Loading Phases，按顺序展示：

```ts
interface LoadingPhase {
  label: string;  // 如 "读取Draw索引"
  status: "pending" | "running" | "done" | "error";
}
```

Loading 状态使用 `LoadingState` 组件展示当前阶段，禁止整页空白。

## 12.16 Empty CTA 规则

每个页面的 Empty 状态必须提供至少 1 个 CTA 按钮，引导用户进入下一步操作。CTA 必须是该上下文下最合理的操作（如"尚无素材"→"导入素材"），不得只写"刷新"。

## 12.17 危险弹窗模板

### 开始抽奖确认
```
标题：确认开始抽奖
影响：将对「{prizeName}」第 {batchNo} 批抽取 {drawCount} 人
信息：有效候选 {candidateCount} 人 | Revision {revision} | 大屏 {displayStatus}
不可逆说明：提交后中奖结果将写入正式记录
按钮：取消 / 确认抽奖
```

### 恢复备份确认
```
标题：确认恢复备份
影响：将使用备份「{backupName}」覆盖当前项目数据
信息：备份时间 {createdAt} | Revision {revision} | 大小 {size}
可恢复说明：当前数据将先保存为临时副本，可在存储管理中恢复
按钮：取消 / 确认恢复
```

所有危险弹窗：
- 不能只写"确定吗？"
- 必须显示业务对象（项目 / Event / Prize / Draw ID / Participant）
- 必须说明不可逆/可恢复
- 危险按钮不得自动 focus

## 12.18 错误码 → UI 映射

| 错误码 | UI 标题 | 影响 | CTA |
|--------|---------|------|-----|
| DB_TRANSACTION_FAILED | 数据库写入失败 | 本轮操作未提交 | 重试 / 查看诊断 |
| DRAW_LOCKED | 抽奖已锁定 | 无法开始新抽奖 | 等待完成 |
| DRAW_INSUFFICIENT_CANDIDATES | 候选人数不足 | 无法完成抽奖 | 调整奖项/规则 |
| DRAW_COMMIT_FAILED | 抽奖提交失败 | 结果未写入 | 重试 / 诊断 |
| DISPLAY_DISCONNECTED | 大屏已断开 | 无法展示结果 | 检查连接 |
| DISPLAY_SYNC_FAILED | 大屏同步失败 | 展示可能不同步 | 重新同步 |
| CANDIDATE_INSUFFICIENT | 候选池不足 | 抽奖无法继续 | 调整规则 |
| PROJECT_NOT_LOCKED | 项目未锁定 | 不可正式抽奖 | 前往锁定 |
| WORKER_NOT_READY | Worker 未就绪 | 计算不可用 | 等待 / 重试 |
| RENDERER_NOT_READY | 渲染器未就绪 | 大屏不可用 | 检查 GPU |
| PRIZE_QUOTA_EXCEEDED | 奖项配额已满 | 无法继续抽取 | 调整配额 |
| IMPORT_PARSE_FAILED | 导入文件解析失败 | 数据未导入 | 检查文件格式 |
| IMPORT_ENCODING_UNKNOWN | 文件编码未知 | 导入中止 | 指定编码 |
| IMPORT_VALIDATION_FAILED | 导入校验失败 | 数据未写入 | 修正数据 |
| STORAGE_QUOTA_LOW | 存储空间不足 | 可能影响操作 | 清理 / 备份 |
| BACKUP_CHECKSUM_FAILED | 备份校验失败 | 备份可能损坏 | 重新选择 / 诊断 |
| ASSET_STORE_READ_FAILED | 素材库读取失败 | 素材不可用 | 重试 / 诊断 |
| ASSET_REFERENCED | 素材正在使用 | 不可删除 | 查看引用 |
| ASSET_HASH_MISMATCH | 素材 Hash 异常 | 完整性存疑 | 完整性检查 |
| WEBGL_CONTEXT_LOST | WebGL 上下文丢失 | 渲染中断 | 自动恢复 |
| WEBGL_UNAVAILABLE | WebGL 不可用 | 3D 功能禁用 | 检查浏览器 |
| AUDIO_DEVICE_LOST | 音频设备不可用 | 无音频输出 | 切换设备 / 静音 |
| AUDIO_DECODE_FAILED | 音频解码失败 | 音频不可用 | 替换素材 |
| REVISION_MISMATCH | 版本不匹配 | 数据不一致 | 检查版本 |
| PERMISSION_DENIED | 权限不足 | 操作被拦截 | 联系管理员 |
| MAINTENANCE_REQUIRED | 需要维护 | 系统被阻塞 | 进入维护模式 |

## 12.19 键盘快捷键规则

- Esc 只关闭非关键弹窗；危险弹窗不得用 Esc 触发确认
- 危险弹窗不得自动 focus 确认按钮
- P0 按钮必须有稳定 `data-testid`

## 12.20 前端开发约束

1. 页面不得直接操作 IndexedDB；通过 Repository / Service / Command 层
2. 页面不得直接调用 LotteryEngine 内部方法；只通过应用服务接口
3. 所有资产选择器只返回 `assetId + version + hash`，不返回任意绝对路径作为业务引用
4. 页面只能消费 `UiCapabilities`，不允许重新拼装规则
5. 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态
6. 开发人员不得自行发明页面结构、状态名称、按钮文字、权限规则、危险操作流程、LIVE 锁定逻辑——如规格未定义，必须补规格后再实现

---

# 第十三部分：菜单与信息架构

## 13.1 完整菜单

```
3D LOTTERY STUDIO

▣ 总览
  └─ 系统总览

◆ 现场运营
  ├─ 抽奖控制
  ├─ 大屏控制
  ├─ 演练模式
  └─ 现场检查

♚ 人员与资格
  ├─ 名单管理
  ├─ 导入中心
  ├─ 资格规则
  └─ 候选预检

★ 奖项管理
  ├─ 奖项设置
  ├─ 批次与轮次
  └─ 作废 / 补抽 / 重抽

🏆 结果与审计
  ├─ 中奖记录
  ├─ 抽奖详情
  ├─ 抽奖审计
  ├─ 独立验证
  └─ 操作日志

▣ 项目与活动
  ├─ 项目管理
  ├─ 活动管理
  ├─ 发布与锁定
  ├─ 项目版本
  └─ 归档与模板

◉ 数据与资源
  ├─ 素材库
  ├─ 场景模板库
  ├─ 奖品素材库
  ├─ Winner Card 模板
  ├─ 头像资源
  ├─ 数据导入导出
  ├─ 备份与恢复
  └─ 存储管理

▤ 视觉与大屏
  ├─ 大屏设置
  ├─ 主题与品牌
  ├─ 动画方案
  ├─ 音频设置
  └─ 显示器校准

⚙ 系统
  ├─ 系统健康
  ├─ 性能监控
  ├─ 权限与用户
  ├─ 系统设置
  ├─ 诊断中心
  └─ 关于系统
```

## 13.2 路由与权限

### 13.2.1 Operator 允许路由

Operator 只能访问以下路由，其它路由完全不可见（不只是 disabled）：

| 路由 | 页面 |
|------|------|
| `/overview` | 系统总览 |
| `/live/draw` | 抽奖控制 |
| `/live/display` | 大屏控制 |
| `/results` | 中奖记录 |
| `/results/:drawId` | 抽奖详情 |
| `/live/check` | 现场检查 |
| `/system/about` | 关于系统 |

其它所有页面：菜单隐藏 + 路由拦截。

### 13.2.2 RouteGuard 行为

```
拦截未授权访问 → 重定向到 /overview → 显示 PERMISSION_DENIED Toast → 写入 SECURITY_NAV_BLOCK OperationLog
```

### 13.2.3 Deep Link 加载顺序

```
1. Role Guard（角色权限）
2. Project Context（项目上下文）
3. Runtime Mode（运行模式）
4. Page Preconditions（页面前置条件）
5. Data Load（数据加载）
```

任一层失败则停止后续加载并显示对应错误状态。

## 13.3 统一权限与运行态 Policy

完整 `UiCapabilities` 定义见 **第 12.10 节 UiCapabilities 完整定义**（27 个能力项）。

页面只能消费 `UiCapabilities`，不允许重新拼装规则。

核心示例：
```ts
canDraw =
  (role === "OPERATOR" || role === "ADMINISTRATOR") &&
  runtimeMode === "LIVE" &&
  projectState === "LOCKED" &&
  eventState === "RUNNING" &&
  systemHealth === "READY" &&
  displayReady &&
  !drawLockActive;

canImport =
  role === "ADMINISTRATOR" &&
  runtimeMode !== "LIVE" &&
  runtimeMode !== "MAINTENANCE" &&
  !storageBlocked;
```

---

# 第十四部分：逐页 UI 契约

> 每页均遵循统一状态矩阵（Loading/Empty/Error/Blocked/LIVE），统一权限规则（消费 UiCapabilities），统一数据依赖声明，统一事件/副作用规范。
> 所有写操作必须经过 Application Service，生成 OperationLog，失败不伪装成功，涉及正式抽奖/锁定/恢复必须显式事务化。

## 14.1 系统总览

**Route**：`/overview`  
**角色**：Operator / Administrator  
**前置条件**：项目已打开；数据库可读  
**说明**：当前活动与系统运行总览

### Header / KPI / Actions

- KPI：参与人员
- KPI：有效候选
- KPI：已中奖
- KPI：剩余奖项
- KPI：已完成轮次
- KPI：当前活动
- Action：`进入抽奖控制`
- Action：`现场检查`

### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 当前抽奖卡
- 系统健康摘要
- 最近中奖
- 最近事件
- 最近备份

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取项目
恢复 Session
读取 Event
读取 Health
读取 Display Snapshot
读取最近 Draw
读取备份摘要
```

### Empty

标题：**当前没有打开项目**

CTA：
- `打开项目`
- `新建项目（Admin）`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PROJECT_OPEN_FAILED | 项目读取失败 | 重试 / 项目管理 |
| SESSION_RECOVERY_FAILED | 会话恢复失败 | 诊断 / 恢复 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`系统总览ViewModelQuery`
- Command：`系统总览Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| OV-001 | BLOCKED 时不可绕过检查进入抽奖 |
| OV-002 | Operator 不显示后台管理快捷入口 |



---

## 14.2 抽奖控制

**Route**：`/live/draw`  
**角色**：Operator / Administrator  
**前置条件**：Project LOCKED；Event RUNNING；System READY；Display READY  
**说明**：正式抽奖主工作台

### Header / KPI / Actions

- KPI：当前奖项
- KPI：总名额
- KPI：已抽
- KPI：剩余
- KPI：本轮抽取
- KPI：有效候选
- KPI：Candidate Snapshot
- Action：`开始抽奖`
- Action：`继续下一轮`
- Action：`重播`
- Action：`查看结果`
- Action：`紧急停止`

### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- WAITING
- PRECHECK
- PREPARING
- COMMITTING
- ROLLING
- SLOWING
- REVEALING
- CELEBRATION
- FINISHED
- STOPPED
- ERROR

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
检查数据库
检查大屏
检查 Worker
检查 DrawLock
检查奖项库存
计算候选池
生成 Candidate Snapshot
准备事务
```

### Empty

标题：**暂无可抽取奖项**

CTA：
- `前往奖项设置（Admin）`
- `刷新状态`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DB_TRANSACTION_FAILED | 本轮未提交 | 重试预检 / 诊断 |
| DRAW_LOCKED | 已有抽奖任务 | 查看当前任务 |
| DISPLAY_DISCONNECTED | 大屏断开 | 重连 |
| CANDIDATE_INSUFFICIENT | 候选人数不足 | 候选预检 |
| PROJECT_NOT_LOCKED | 项目未锁定 | 发布与锁定 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- COMMITTING 后 Start 按钮立即 disabled；COMMITTED 后只允许继续/重播/查看。

### Data / Command Boundary

- Query：`抽奖控制ViewModelQuery`
- Command：`抽奖控制Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| DRAW-001 | 连续点击10次只产生1个transactionId |
| DRAW-002 | COMMITTED刷新恢复原winnerIds |
| DRAW-003 | Emergency Stop不回滚winner |



---

## 14.3 大屏控制

**Route**：`/live/display`  
**角色**：Operator / Administrator  
**前置条件**：Display Runtime 可用  
**说明**：第二显示器与 Presentation 控制

### Header / KPI / Actions

- KPI：目标显示器
- KPI：分辨率
- KPI：刷新率
- KPI：FPS
- KPI：Renderer
- KPI：性能模式
- Action：`打开大屏`
- Action：`全屏`
- Action：`重新识别显示器`
- Action：`同步状态`
- Action：`SAFE`

### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 显示器列表
- 轻量 Preview
- Scene
- Phase
- Prize
- Winner Layout
- Safe Area
- Heartbeat

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
枚举显示器
读取Display Window
握手
读取Renderer
读取GPU Capability
同步Snapshot
```

### Empty

标题：**未检测到第二显示器**

CTA：
- `重新识别显示器`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DISPLAY_DISCONNECTED | 大屏连接中断 | 重连 |
| WEBGL_CONTEXT_LOST | Renderer恢复中 | 等待 / SAFE |
| DISPLAY_SYNC_FAILED | 同步失败 | 重新同步 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`大屏控制ViewModelQuery`
- Command：`大屏控制Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| DSPCTRL-001 | Display重启后Snapshot恢复当前结果 |
| DSPCTRL-002 | 热插拔后可重新识别目标屏 |



---

## 14.4 演练模式

**Route**：`/live/dry-run`  
**角色**：Operator / Administrator  
**前置条件**：Event 非 LIVE  
**说明**：模拟正式流程但不写正式中奖数据

### Header / KPI / Actions

- KPI：测试名单
- KPI：测试奖项
- KPI：Display
- KPI：GPU
- KPI：Audio
- KPI：SAFE Mode
- Action：`完整模拟`
- Action：`多人测试`
- Action：`头像测试`
- Action：`音频测试`
- Action：`SAFE测试`
- Action：`断线恢复测试`

### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 完整流程
- 1人
- 4人
- 6人
- 9人
- 12人
- 36人
- 100人
- Emergency Stop
- Reconnect

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
准备测试数据
加载场景
检查Display
预加载音频
启动Dry Run Session
```

### Empty

标题：**暂无演练记录**

CTA：
- `开始完整演练`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DRY_RUN_DATA_FAILED | 演练数据准备失败 | 重试 |
| DRY_RUN_DISPLAY_FAILED | 演练Display失败 | 大屏控制 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- DRY_RUN：必须显示明显水印，且不写正式中奖数据。

### Data / Command Boundary

- Query：`演练模式ViewModelQuery`
- Command：`演练模式Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| DRY-001 | 不修改participant.status |
| DRY-002 | 不消耗正式奖项配额 |
| DRY-003 | 不写正式DrawRecord |



---

## 14.5 现场检查

**Route**：`/live/check`  
**角色**：Operator / Administrator  
**前置条件**：项目已打开  
**说明**：正式活动前 P0/P1 检查

### Header / KPI / Actions


### 筛选器

| 筛选器 | 字段 | 控件 | 操作符 | 默认 |
|---|---|---|---|---|
| 状态 | status | MultiSelect | equals / in | 全部 |
| 分类 | category | MultiSelect | equals / in | 全部 |

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 状态 | status | 90 | 是 | 是 | equals / in | left | 是 | PASS/WARN/FAIL |
| 分类 | category | 120 | 是 | 是 | equals / in |  | 是 |  |
| 检查项 | name | 240 | 是 | 是 | contains |  | 是 |  |
| 当前值 | currentValue | 220 | 否 | 否 | — |  | 是 |  |
| 要求 | expected | 220 | 否 | 否 | — |  | 是 |  |
| 级别 | severity | 90 | 是 | 是 | equals / in |  | 是 | P0/P1 |
| 操作 | actions | 140 | 否 | 否 | — | right | 是 | 修复/重试 |

**默认排序**：`severity DESC, category ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
检查IndexedDB
检查Schema
检查完整性
检查Worker
检查Lottery Engine
检查WebGL
检查GPU
检查Display
检查Storage
检查Audio
检查Backup
```

### Empty

标题：**尚未运行现场检查**

CTA：
- `运行全部检查`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| HEALTH_CHECK_FAILED | 现场检查失败 | 重试 / 诊断 |
| P0_CHECK_FAILED | 存在关键阻塞项 | 查看失败项 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`现场检查ViewModelQuery`
- Command：`现场检查Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| CHECK-001 | 任一P0 FAIL阻止LIVE |
| CHECK-002 | 每个FAIL有修复入口 |



---

## 14.6 名单管理

**Route**：`/people`  
**角色**：Administrator  
**前置条件**：项目已打开；LIVE 只读  
**说明**：人员主数据与资格状态

### Header / KPI / Actions


### 筛选器

| 筛选器 | 字段 | 控件 | 操作符 | 默认 |
|---|---|---|---|---|
| 关键词 | q | Text | contains |  |
| 单位 | organization | MultiSelect | in | 全部 |
| 部门 | department | MultiSelect | in | 全部 |
| 资格 | status | MultiSelect | in | 全部 |
| 中奖状态 | winnerState | Select | equals | 全部 |

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 选择 | _select | 48 | 否 | 否 | — | left | 是 | checkbox |
| 头像 | avatarAssetHash | 72 | 否 | 是 | equals | left | 是 | 40px |
| 编号 | id | 150 | 是 | 是 | equals / contains | left | 否 | 内部ID |
| 工号 | employeeNo | 120 | 是 | 是 | equals / contains | left | 是 |  |
| 姓名 | name | 160 | 是 | 是 | contains |  | 是 | 允许重名 |
| 单位 | organization | 200 | 是 | 是 | equals / in |  | 是 |  |
| 部门 | department | 180 | 是 | 是 | equals / in |  | 是 |  |
| 资格 | status | 110 | 是 | 是 | equals / in |  | 是 | 颜色+文字 |
| 中奖状态 | winnerState | 120 | 是 | 是 | equals |  | 是 |  |
| 中奖奖项 | winnerPrize | 160 | 是 | 是 | equals / in |  | 是 |  |
| Revision | revision | 100 | 是 | 是 | equals |  | 是 |  |
| 更新时间 | updatedAt | 170 | 是 | 是 | before / after / between |  | 是 |  |
| 操作 | actions | 140 | 否 | 否 | — | right | 是 |  |

**默认排序**：`employeeNo ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取人员索引
读取筛选元数据
统计KPI
加载首屏记录
```

### Empty

标题：**暂无人员**

CTA：
- `导入名单`
- `新增人员`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PARTICIPANT_READ_FAILED | 人员数据读取失败 | 重试 / 诊断 |
| PARTICIPANT_CONFLICT | 业务唯一键冲突 | 查看冲突 |
| REVISION_MISMATCH | 数据版本已变化 | 刷新 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`名单管理ViewModelQuery`
- Command：`名单管理Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PEOPLE-001 | 100K行使用VirtualDataTable |
| PEOPLE-002 | 重复姓名允许 |
| PEOPLE-003 | LIVE编辑禁用 |



---

## 14.7 导入中心

**Route**：`/people/import`  
**角色**：Administrator  
**前置条件**：非 LIVE；Storage 非 BLOCKED  
**说明**：Excel/CSV/头像导入流程

### Header / KPI / Actions


### 筛选器

| 筛选器 | 字段 | 控件 | 操作符 | 默认 |
|---|---|---|---|---|
| 类型 | type | MultiSelect | in | 全部 |
| 状态 | status | MultiSelect | in | 全部 |
| 时间 | startedAt | DateRange | between | 最近30天 |

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| Job ID | id | 180 | 是 | 是 | equals / contains | left | 是 |  |
| 类型 | type | 120 | 是 | 是 | equals / in |  | 是 |  |
| 文件 | fileName | 240 | 是 | 是 | contains |  | 是 |  |
| 总数 | total | 100 | 是 | 否 | — |  | 是 |  |
| 成功 | success | 100 | 是 | 否 | — |  | 是 |  |
| 跳过 | skipped | 100 | 是 | 否 | — |  | 是 |  |
| 冲突 | conflict | 100 | 是 | 是 | > / = |  | 是 |  |
| 失败 | failed | 100 | 是 | 是 | > / = |  | 是 |  |
| 状态 | status | 130 | 是 | 是 | equals / in |  | 是 |  |
| 开始时间 | startedAt | 180 | 是 | 是 | between |  | 是 |  |
| 耗时 | duration | 110 | 是 | 否 | — |  | 是 |  |
| 操作 | actions | 150 | 否 | 否 | — | right | 是 |  |

**默认排序**：`startedAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取文件
识别编码
解析表头
字段映射
数据校验
重复检查
头像匹配
写入Staging
Commit
完成
```

### Empty

标题：**暂无导入任务**

CTA：
- `导入Excel`
- `导入CSV`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| IMPORT_PARSE_FAILED | 文件解析失败 | 下载错误报告 |
| IMPORT_ENCODING_UNKNOWN | 编码不确定 | 选择编码 |
| IMPORT_CONFLICT_UNRESOLVED | 存在未解决冲突 | 处理冲突 |
| STORAGE_QUOTA_LOW | 存储不足 | 存储管理 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`导入中心ViewModelQuery`
- Command：`导入中心Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| IMPORT-001 | 失败导入不污染正式数据 |
| IMPORT-002 | 100K导入UI不冻结 |



---

## 14.8 资格规则

**Route**：`/people/eligibility`  
**角色**：Administrator  
**前置条件**：项目已打开；非 LIVE  
**说明**：候选资格规则与 Revision

### Header / KPI / Actions


### 筛选器

| 筛选器 | 字段 | 控件 | 操作符 | 默认 |
|---|---|---|---|---|
| 规则类型 | type | MultiSelect | in | 全部 |
| 启用 | enabled | Select | equals | 全部 |
| 奖项 | prizeId | MultiSelect | in | 全部 |

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 顺序 | order | 80 | 是 | 否 | — | left | 是 | 拖拽 |
| 规则名称 | name | 220 | 是 | 是 | contains | left | 是 |  |
| 类型 | type | 180 | 是 | 是 | equals / in |  | 是 |  |
| 条件摘要 | conditionSummary | 320 | 否 | 否 | — |  | 是 |  |
| 影响人数 | affectedCount | 110 | 是 | 是 | > / = |  | 是 |  |
| 启用 | enabled | 90 | 是 | 是 | equals |  | 是 |  |
| Revision | revision | 100 | 是 | 是 | equals |  | 是 |  |
| 更新时间 | updatedAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 150 | 否 | 否 | — | right | 是 |  |

**默认排序**：`order ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取规则
读取字段目录
计算影响人数
读取Revision
```

### Empty

标题：**暂无资格规则**

CTA：
- `新增规则`
- `导入规则模板`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| ELIGIBILITY_RULE_INVALID | 规则无效 | 编辑规则 |
| ELIGIBILITY_EVALUATION_FAILED | 规则预估失败 | 重试 / 诊断 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`资格规则ViewModelQuery`
- Command：`资格规则Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| ELIG-001 | 相同Revision得到稳定候选 |
| ELIG-002 | LIVE不可发布新Revision |



---

## 14.9 候选预检

**Route**：`/people/preflight`  
**角色**：Operator / Administrator  
**前置条件**：已选择 Prize/Batch  
**说明**：正式候选池预检

### Header / KPI / Actions


### 筛选器

| 筛选器 | 字段 | 控件 | 操作符 | 默认 |
|---|---|---|---|---|
| 奖项 | prizeId | Select | equals | 当前 |
| 批次 | batchId | Select | equals | 当前 |
| 结果 | included | Select | equals | 全部 |

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 人员ID | participantId | 180 | 是 | 是 | equals / contains | left | 是 |  |
| 姓名 | name | 160 | 是 | 是 | contains | left | 是 |  |
| 结果 | included | 100 | 是 | 是 | equals |  | 是 | Included/Excluded |
| 排除原因 | excludeReason | 220 | 是 | 是 | equals / in |  | 是 |  |
| 命中规则 | ruleName | 220 | 是 | 是 | contains |  | 是 |  |

**默认排序**：`included DESC, name ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取锁定Revision
执行Eligibility Engine
统计排除原因
Canonical Sort
计算Candidate Snapshot Hash
```

### Empty

标题：**尚未生成候选预检**

CTA：
- `生成候选预检`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| CANDIDATE_RESOLVE_FAILED | 候选池计算失败 | 重试 / 诊断 |
| CANDIDATE_INSUFFICIENT | 候选人数不足 | 调整批次 / 规则 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`候选预检ViewModelQuery`
- Command：`候选预检Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PREFLIGHT-001 | 相同Revision生成稳定Snapshot Hash |
| PREFLIGHT-002 | 排除统计关系一致 |



---

## 14.10 奖项设置

**Route**：`/prizes`  
**角色**：Administrator  
**前置条件**：项目已打开；非 LIVE  
**说明**：奖项、配额与展示配置

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 排序 | order | 80 | 是 | 否 | — | left | 是 |  |
| 奖项图 | prizeAsset | 72 | 否 | 否 | — | left | 是 |  |
| 奖项名称 | name | 180 | 是 | 是 | contains | left | 是 |  |
| 总名额 | totalCount | 100 | 是 | 否 | — |  | 是 |  |
| 已抽 | committedCount | 90 | 是 | 否 | — |  | 是 |  |
| 剩余 | remainingCount | 90 | 是 | 否 | — |  | 是 |  |
| 每轮人数 | defaultBatchCount | 100 | 是 | 否 | — |  | 是 |  |
| 资格规则 | eligibilityPreset | 180 | 是 | 是 | equals / in |  | 是 |  |
| 动画方案 | animationPreset | 160 | 是 | 是 | equals / in |  | 是 |  |
| Winner Card | winnerCard | 160 | 是 | 是 | equals / in |  | 是 |  |
| 状态 | enabled | 100 | 是 | 是 | equals |  | 是 |  |
| 操作 | actions | 140 | 否 | 否 | — | right | 是 |  |

**默认排序**：`order ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取奖项
读取配额
读取资格规则
读取展示引用
```

### Empty

标题：**尚未配置奖项**

CTA：
- `新增奖项`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PRIZE_QUOTA_INVALID | 奖项配额无效 | 修改数量 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`奖项设置ViewModelQuery`
- Command：`奖项设置Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PRIZE-001 | remainingCount一致 |
| PRIZE-002 | LIVE不可编辑 |



---

## 14.11 批次与轮次

**Route**：`/prizes/batches`  
**角色**：Administrator  
**前置条件**：存在 Prize  
**说明**：Prize Batch / Draw Round

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 奖项 | prizeName | 180 | 是 | 是 | equals / in | left | 是 |  |
| Batch | batchNo | 90 | 是 | 是 | equals | left | 是 |  |
| 计划人数 | plannedCount | 100 | 是 | 否 | — |  | 是 |  |
| 已抽人数 | drawnCount | 100 | 是 | 否 | — |  | 是 |  |
| 状态 | status | 110 | 是 | 是 | equals / in |  | 是 |  |
| Draw次数 | drawCount | 100 | 是 | 否 | — |  | 是 |  |
| 最后时间 | lastDrawAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`prizeName ASC, batchNo ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Prize
读取Batch
读取DrawRound
汇总配额
```

### Empty

标题：**暂无批次**

CTA：
- `新增批次`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| BATCH_COUNT_INVALID | 批次人数无效 | 修改人数 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`批次与轮次ViewModelQuery`
- Command：`批次与轮次Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| BATCH-001 | 批次总人数不超Prize总名额 |



---

## 14.12 作废 / 补抽 / 重抽

**Route**：`/prizes/exceptions`  
**角色**：Administrator  
**前置条件**：存在历史 Draw  
**说明**：异常结果处理

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 原Draw ID | drawId | 180 | 是 | 是 | equals / contains | left | 是 |  |
| 奖项 | prizeName | 160 | 是 | 是 | equals / in |  | 是 |  |
| 批次 | batchNo | 90 | 是 | 是 | equals |  | 是 |  |
| 中奖人员 | winnerSummary | 240 | 否 | 是 | contains |  | 是 |  |
| 状态 | status | 120 | 是 | 是 | equals / in |  | 是 |  |
| 处理原因 | reason | 240 | 是 | 是 | contains |  | 是 |  |
| 替代Draw | replacementDrawId | 180 | 是 | 是 | contains |  | 是 |  |
| 处理人 | actor | 140 | 是 | 是 | equals / in |  | 是 |  |
| 时间 | handledAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 150 | 否 | 否 | — | right | 是 |  |

**默认排序**：`handledAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取异常Draw
读取Replacement链
读取OperationLog
```

### Empty

标题：**暂无异常处理记录**

CTA：
- `查看中奖记录`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DRAW_VOID_FORBIDDEN | 当前Draw不可作废 | 查看状态 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`作废补抽重抽ViewModelQuery`
- Command：`作废补抽重抽Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| EXC-001 | 原Draw永不删除 |
| EXC-002 | Replacement链可追踪 |



---

## 14.13 中奖记录

**Route**：`/results`  
**角色**：Operator / Administrator  
**前置条件**：项目已打开  
**说明**：正式 Draw 历史

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| Draw ID | id | 180 | 是 | 是 | equals / contains | left | 是 |  |
| 奖项 | prizeName | 160 | 是 | 是 | equals / in | left | 是 |  |
| 批次 | batchNo | 90 | 是 | 是 | equals |  | 是 |  |
| 中奖人数 | drawCount | 100 | 是 | 否 | — |  | 是 |  |
| 候选人数 | candidateCount | 110 | 是 | 否 | — |  | 是 |  |
| 状态 | status | 110 | 是 | 是 | equals / in |  | 是 |  |
| 算法 | algorithmVersion | 220 | 是 | 是 | equals / in |  | 是 |  |
| 时间 | committedAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 180 | 否 | 否 | — | right | 是 |  |

**默认排序**：`committedAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Draw索引
读取Prize映射
读取Winner摘要
```

### Empty

标题：**尚无抽奖记录**

CTA：
- `前往抽奖控制`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DRAW_READ_FAILED | 中奖记录读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`中奖记录ViewModelQuery`
- Command：`中奖记录Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| RESULT-001 | Replay不重新随机 |



---

## 14.14 抽奖详情

**Route**：`/results/:drawId`  
**角色**：Operator / Administrator  
**前置条件**：Draw 存在  
**说明**：Draw 技术与 Winner 详情

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Winner Cards
- Transaction ID
- Seed
- Algorithm Version
- Candidate Snapshot Hash
- Result Hash
- Commit Hash
- Build Version
- Timeline

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Draw
读取Winner
读取Audit Hash
读取Timeline
```

### Empty

标题：**Draw不存在**

CTA：
- `返回中奖记录`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DRAW_NOT_FOUND | 未找到Draw | 返回中奖记录 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`抽奖详情ViewModelQuery`
- Command：`抽奖详情Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| DRAWDETAIL-001 | winnerIds不可编辑 |



---

## 14.15 抽奖审计

**Route**：`/audit/draws`  
**角色**：Administrator  
**前置条件**：Draw 存在  
**说明**：抽奖复算与 Hash 验证

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Project Snapshot PASS
- Candidate Snapshot PASS
- Seed PASS
- Algorithm PASS
- Winner Recalculation PASS
- Result Hash PASS
- Commit Hash PASS

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Draw
加载Verifier
加载Candidate Snapshot
复算Winner
校验Hash
```

### Empty

标题：**暂无待验证Draw**

CTA：
- `查看中奖记录`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| VERIFY_FAILED | 抽奖验证失败 | 查看复算日志 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`抽奖审计ViewModelQuery`
- Command：`抽奖审计Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| AUDIT-001 | 相同输入复算相同winnerIds |



---

## 14.16 独立验证

**Route**：`/audit/verifier`  
**角色**：Administrator  
**前置条件**：无  
**说明**：离线审计包验证

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 文件拖拽区
- Manifest
- Draw验证树
- 验证日志
- 报告导出

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Audit Package
校验Manifest
校验Hash
加载算法
逐Draw复算
生成报告
```

### Empty

标题：**尚未选择审计包**

CTA：
- `选择Event Audit ZIP`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| VERIFY_PACKAGE_INVALID | 审计包无效 | 重新选择 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`独立验证ViewModelQuery`
- Command：`独立验证Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| VERIFIER-001 | 不依赖当前项目数据库 |



---

## 14.17 操作日志

**Route**：`/audit/logs`  
**角色**：Administrator  
**前置条件**：日志可读  
**说明**：Append-only 审计日志

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 时间 | timestamp | 180 | 是 | 是 | between | left | 是 |  |
| 用户 | actor | 140 | 是 | 是 | equals / in |  | 是 |  |
| 动作 | action | 200 | 是 | 是 | equals / in |  | 是 |  |
| 对象 | object | 180 | 是 | 是 | contains |  | 是 |  |
| 结果 | result | 100 | 是 | 是 | equals / in |  | 是 |  |
| Severity | severity | 100 | 是 | 是 | equals / in |  | 是 |  |
| Hash | payloadHash | 220 | 否 | 是 | contains |  | 是 |  |
| 详情 | details | 120 | 否 | 否 | — | right | 是 |  |

**默认排序**：`timestamp DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取日志索引
加载筛选元数据
加载首屏日志
```

### Empty

标题：**暂无操作日志**

CTA：
- `刷新`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| AUDIT_LOG_READ_FAILED | 日志读取失败 | 重试 / 诊断 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`操作日志ViewModelQuery`
- Command：`操作日志Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| LOG-001 | 日志不可编辑删除 |



---

## 14.18 项目管理

**Route**：`/projects`  
**角色**：Administrator  
**前置条件**：应用已启动  
**说明**：项目创建、打开、克隆、归档

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 项目名 | name | 240 | 是 | 是 | contains | left | 是 |  |
| 人员数 | participantCount | 100 | 是 | 否 | — |  | 是 |  |
| 奖项数 | prizeCount | 100 | 是 | 否 | — |  | 是 |  |
| Revision | revision | 100 | 是 | 是 | equals |  | 是 |  |
| 状态 | state | 120 | 是 | 是 | equals / in |  | 是 |  |
| 最后修改 | updatedAt | 180 | 是 | 是 | between |  | 是 |  |
| 最近活动 | lastEvent | 180 | 是 | 是 | contains |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`updatedAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Project Registry
读取Revision摘要
读取Event摘要
```

### Empty

标题：**暂无项目**

CTA：
- `新建项目`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PROJECT_LIST_FAILED | 项目列表读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`项目管理ViewModelQuery`
- Command：`项目管理Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PROJECT-001 | 归档项目只读 |



---

## 14.19 活动管理

**Route**：`/events`  
**角色**：Administrator  
**前置条件**：项目已打开  
**说明**：LIVE/DRY_RUN Event 管理

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| Event | name | 220 | 是 | 是 | contains | left | 是 |  |
| 模式 | mode | 120 | 是 | 是 | equals |  | 是 |  |
| 状态 | state | 120 | 是 | 是 | equals / in |  | 是 |  |
| Revision | revision | 100 | 是 | 是 | equals |  | 是 |  |
| 开始 | startedAt | 180 | 是 | 是 | between |  | 是 |  |
| 结束 | endedAt | 180 | 是 | 是 | between |  | 是 |  |
| Draw数 | drawCount | 100 | 是 | 否 | — |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`startedAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Events
读取Revision
汇总Draw
```

### Empty

标题：**暂无活动**

CTA：
- `新建活动`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| EVENT_READ_FAILED | 活动读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`活动管理ViewModelQuery`
- Command：`活动管理Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| EVENT-001 | LIVE Event不可直接回退Draft |



---

## 14.20 发布与锁定

**Route**：`/release-lock`  
**角色**：Administrator  
**前置条件**：项目已打开  
**说明**：Workspace→Publish→Lock→LIVE

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Workspace
- Validate
- Publish
- Lock
- LIVE
- End
- 负责人
- 时间
- Snapshot Hash

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Workspace
运行Validation
生成Revision
计算Project Snapshot
校验Asset Revision
准备Lock
```

### Empty

标题：**暂无可发布草稿**

CTA：
- `返回项目管理`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| VALIDATION_FAILED | 项目校验失败 | 查看报告 |
| EVENT_LOCK_FAILED | 活动锁定失败 | 重试 / 诊断 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`发布与锁定ViewModelQuery`
- Command：`发布与锁定Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| LOCK-001 | P0失败不得Publish/Lock/LIVE |



---

## 14.21 项目版本

**Route**：`/revisions`  
**角色**：Administrator  
**前置条件**：存在 Revision  
**说明**：Revision 历史与 Diff

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| Revision | revision | 100 | 是 | 是 | equals | left | 是 |  |
| Participants Rev | participantsRevision | 130 | 是 | 是 | equals |  | 是 |  |
| Prize Rev | prizeRevision | 110 | 是 | 是 | equals |  | 是 |  |
| Eligibility Rev | eligibilityRevision | 130 | 是 | 是 | equals |  | 是 |  |
| Settings Rev | settingsRevision | 120 | 是 | 是 | equals |  | 是 |  |
| Snapshot Hash | snapshotHash | 260 | 否 | 是 | contains |  | 是 |  |
| 发布时间 | publishedAt | 180 | 是 | 是 | between |  | 是 |  |
| 发布人 | actor | 140 | 是 | 是 | equals / in |  | 是 |  |
| 状态 | state | 110 | 是 | 是 | equals / in |  | 是 |  |

**默认排序**：`revision DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Revision列表
读取Snapshot
计算Diff摘要
```

### Empty

标题：**暂无Revision**

CTA：
- `发布项目`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| REVISION_READ_FAILED | 版本读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`项目版本ViewModelQuery`
- Command：`项目版本Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| REV-001 | 历史Revision不可修改 |



---

## 14.22 归档与模板

**Route**：`/archive-templates`  
**角色**：Administrator  
**前置条件**：无  
**说明**：归档项目与 Project Template

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 归档Tab
- 模板Tab
- 项目摘要
- 模板结构

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取归档索引
读取模板索引
读取Audit摘要
```

### Empty

标题：**暂无归档或模板**

CTA：
- `创建模板`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| ARCHIVE_READ_FAILED | 归档读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`归档与模板ViewModelQuery`
- Command：`归档与模板Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| ARCH-001 | 模板不含真实人员和历史Draw |



---

## 14.23 素材库

**Route**：`/assets`  
**角色**：Administrator  
**前置条件**：Asset Store 可读；LIVE 只读  
**说明**：原子素材中心

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 缩略图 | preview | 72 | 否 | 否 | — | left | 是 |  |
| 名称 | name | 220 | 是 | 是 | contains | left | 是 |  |
| 类型 | type | 120 | 是 | 是 | equals / in |  | 是 |  |
| 分类 | category | 140 | 是 | 是 | equals / in |  | 是 |  |
| 规格 | dimensions | 140 | 是 | 是 | contains |  | 是 |  |
| 大小 | size | 110 | 是 | 是 | between |  | 是 |  |
| 引用次数 | referenceCount | 100 | 是 | 是 | between |  | 是 |  |
| 版本 | version | 90 | 是 | 是 | equals |  | 是 |  |
| 标签 | tags | 200 | 否 | 是 | contains |  | 是 |  |
| 状态 | status | 120 | 是 | 是 | equals / in |  | 是 |  |
| 更新时间 | updatedAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`updatedAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
打开Asset Store
读取索引
检查引用
加载缩略图
读取GPU状态
```

### Empty

标题：**尚无素材**

CTA：
- `导入素材`
- `导入素材包`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| ASSET_STORE_READ_FAILED | 素材库读取失败 | 重试 / 诊断 |
| ASSET_REFERENCED | 素材正在使用 | 查看引用 |
| ASSET_HASH_MISMATCH | 素材Hash异常 | 完整性检查 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`素材库ViewModelQuery`
- Command：`素材库Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| ASSET-001 | 被引用素材不可删除 |
| ASSET-002 | Event Lock冻结版本 |



---

## 14.24 场景模板库

**Route**：`/assets/scenes`  
**角色**：Administrator  
**前置条件**：Renderer 兼容；LIVE 只读  
**说明**：组合场景模板

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Scene列表
- 4K Preview
- Phase
- Background
- Particle
- Camera
- Lighting
- PostProcessing
- Audio
- Winner Layout
- Safe Area
- Performance Tier

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Scene Templates
读取依赖Assets
检查Renderer兼容性
生成Preview
```

### Empty

标题：**暂无场景模板**

CTA：
- `新建场景`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| SCENE_INCOMPATIBLE | Scene与Renderer不兼容 | 性能/兼容检查 |
| SCENE_ASSET_MISSING | 场景依赖缺失 | 修复依赖 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`场景模板库ViewModelQuery`
- Command：`场景模板库Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| SCENE-001 | 不做自由3D编辑器 |
| SCENE-002 | 版本进入Event Snapshot |



---

## 14.25 奖品素材库

**Route**：`/assets/prizes`  
**角色**：Administrator  
**前置条件**：项目可读；LIVE 只读  
**说明**：Prize 展示素材

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 主图 | image | 72 | 否 | 否 | — | left | 是 |  |
| 奖品名 | name | 200 | 是 | 是 | contains | left | 是 |  |
| 品牌 | brand | 140 | 是 | 是 | contains |  | 是 |  |
| 型号 | model | 160 | 是 | 是 | contains |  | 是 |  |
| 类别 | category | 140 | 是 | 是 | equals / in |  | 是 |  |
| 关联奖项 | prizeName | 180 | 是 | 是 | equals / in |  | 是 |  |
| 关联批次 | batchNo | 100 | 是 | 是 | equals |  | 是 |  |
| 状态 | status | 110 | 是 | 是 | equals / in |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`name ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Prize Assets
读取Prize映射
加载Preview
```

### Empty

标题：**暂无奖品素材**

CTA：
- `新增奖品素材`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PRIZE_ASSET_MISSING_IMAGE | 奖品缺少主图 | 选择图片 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`奖品素材库ViewModelQuery`
- Command：`奖品素材库Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PRA-001 | 仅展示用途 |



---

## 14.26 Winner Card 模板

**Route**：`/assets/winner-cards`  
**角色**：Administrator  
**前置条件**：Asset Store 可读；LIVE 只读  
**说明**：中奖卡片模板

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 模板Grid
- 4K Preview
- LayoutPreset
- AvatarShape
- Typography
- Spacing
- SafeArea

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Winner Card
加载字体与素材
生成4K Preview
检查Safe Area
```

### Empty

标题：**暂无Winner Card模板**

CTA：
- `新建模板`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| WINNER_CARD_OVERFLOW | 卡片越界 | 调整布局 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`WinnerCard模板ViewModelQuery`
- Command：`WinnerCard模板Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| WCARD-001 | 预设布局+参数化编辑 |



---

## 14.27 头像资源

**Route**：`/assets/avatars`  
**角色**：Administrator  
**前置条件**：Participant 可读；LIVE 只读  
**说明**：头像匹配与变体

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 头像Grid/Table
- 原图
- 64/128/256/512
- Hash
- 引用
- GPU Cache

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取头像索引
匹配Participant
加载Variants
读取GPU Cache
```

### Empty

标题：**暂无头像资源**

CTA：
- `导入头像`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| AVATAR_DECODE_FAILED | 头像解码失败 | 重新导入 |
| AVATAR_AMBIGUOUS | 头像匹配冲突 | 人工匹配 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`头像资源ViewModelQuery`
- Command：`头像资源Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| AVATAR-001 | 坏图不导致Worker崩溃 |



---

## 14.28 数据导入导出

**Route**：`/data/io`  
**角色**：Administrator  
**前置条件**：项目已打开  
**说明**：业务数据导入导出

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 导出Tab
- 导入Tab
- 历史Tab
- 人员CSV/XLSX
- Winners CSV
- Draw JSON
- Audit JSON
- Event Audit ZIP
- Project Backup

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
准备任务
收集数据
脱敏/过滤
序列化
写文件
计算Hash
```

### Empty

标题：**暂无导入导出任务**

CTA：
- `创建导出任务`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| EXPORT_FAILED | 导出失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`数据导入导出ViewModelQuery`
- Command：`数据导入导出Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| IO-001 | 不输出内部Blob URL |



---

## 14.29 备份与恢复

**Route**：`/data/backups`  
**角色**：Administrator  
**前置条件**：Storage 可写  
**说明**：备份、校验与 Staging 恢复

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 备份名 | name | 220 | 是 | 是 | contains | left | 是 |  |
| 类型 | type | 120 | 是 | 是 | equals / in |  | 是 |  |
| 时间 | createdAt | 180 | 是 | 是 | between |  | 是 |  |
| Revision | revision | 100 | 是 | 是 | equals |  | 是 |  |
| 大小 | size | 110 | 是 | 是 | between |  | 是 |  |
| Checksum | checksum | 240 | 否 | 是 | contains |  | 是 |  |
| 验证状态 | integrity | 120 | 是 | 是 | equals / in |  | 是 |  |
| 操作 | actions | 180 | 否 | 否 | — | right | 是 |  |

**默认排序**：`createdAt DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Manifest
校验文件列表
校验Checksum
创建Staging
恢复数据
执行Integrity Check
```

### Empty

标题：**暂无备份**

CTA：
- `立即备份`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| BACKUP_CHECKSUM_FAILED | 备份校验失败 | 重新选择 / 诊断 |
| BACKUP_RESTORE_FAILED | 恢复失败 | 查看诊断 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`备份与恢复ViewModelQuery`
- Command：`备份与恢复Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| BACKUP-001 | 恢复必须Staging |
| BACKUP-002 | 失败不覆盖当前项目 |



---

## 14.30 存储管理

**Route**：`/data/storage`  
**角色**：Administrator  
**前置条件**：Storage API 可读  
**说明**：空间、缓存与清理

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 类别 | category | 160 | 是 | 是 | equals / in | left | 是 |  |
| 大小 | size | 120 | 是 | 是 | between |  | 是 |  |
| 对象数 | objectCount | 100 | 是 | 否 | — |  | 是 |  |
| 最近使用 | lastUsedAt | 180 | 是 | 是 | between |  | 是 |  |
| 可清理 | cleanable | 100 | 是 | 是 | equals |  | 是 |  |
| 风险 | risk | 120 | 是 | 是 | equals / in |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`size DESC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Storage Estimate
统计IndexedDB
统计Assets
统计Backups
统计Cache
统计Logs
```

### Empty

标题：**暂无可清理内容**

CTA：
- `刷新统计`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| STORAGE_QUOTA_LOW | 存储空间不足 | 清理缓存 / 备份 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`存储管理ViewModelQuery`
- Command：`存储管理Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| STORE-001 | LIVE禁止重清理 |



---

## 14.31 大屏设置

**Route**：`/visual/display`  
**角色**：Administrator  
**前置条件**：Display Runtime 可用；LIVE 只读  
**说明**：显示器、安全区与性能设置

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 目标显示器
- 分辨率
- 刷新率
- DPR
- Safe Area
- Performance Tier
- Fullscreen
- Kiosk
- 防休眠
- Preview

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
枚举显示器
读取Capabilities
读取当前Profile
生成Preview
```

### Empty

标题：**未检测到显示器**

CTA：
- `重新识别显示器`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DISPLAY_SETTINGS_INVALID | 显示参数无效 | 修正参数 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`大屏设置ViewModelQuery`
- Command：`大屏设置Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| V-DISPLAY-001 | LIVE关键参数锁定 |



---

## 14.32 主题与品牌

**Route**：`/visual/theme`  
**角色**：Administrator  
**前置条件**：Asset Center 可读；LIVE 只读  
**说明**：品牌与主题引用

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- 主题列表
- Preview
- Logo
- 标题
- 红金色
- 背景
- 字体
- Winner Card
- Scene Set

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Themes
解析Asset引用
检查Scene/WinnerCard
生成Preview
```

### Empty

标题：**暂无主题**

CTA：
- `新建主题`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| THEME_ASSET_MISSING | 主题资源缺失 | 修复引用 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`主题与品牌ViewModelQuery`
- Command：`主题与品牌Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| THEME-001 | 只引用Asset Center |



---

## 14.33 动画方案

**Route**：`/visual/animation`  
**角色**：Administrator  
**前置条件**：Scene/Audio 可读；LIVE 只读  
**说明**：Timeline Preset

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Preset表
- 受限Timeline
- Camera
- Particle
- Audio
- Scene

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Preset
加载Scene引用
加载Audio引用
计算Timeline
生成Preview
```

### Empty

标题：**暂无动画方案**

CTA：
- `新建Preset`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| ANIMATION_PRESET_INVALID | 动画参数无效 | 修正参数 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`动画方案ViewModelQuery`
- Command：`动画方案Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| ANIM-001 | 统一Timeline驱动 |
| ANIM-002 | 不做自由AE式Timeline |



---

## 14.34 音频设置

**Route**：`/visual/audio`  
**角色**：Administrator  
**前置条件**：Audio Runtime 可用  
**说明**：设备、Mixer、Audio Preset

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Output Device
- Mixer
- Master
- Music
- Rolling
- Reveal
- Celebration
- UI
- 音频选择

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
枚举音频设备
读取Mixer
预加载音频
Decode Test
```

### Empty

标题：**未检测到音频设备**

CTA：
- `静音继续`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| AUDIO_DEVICE_LOST | 音频设备不可用 | 切换设备 / 静音 |
| AUDIO_DECODE_FAILED | 音频解码失败 | 替换素材 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`音频设置ViewModelQuery`
- Command：`音频设置Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| AUDIO-001 | 音频失败不阻止COMMIT |



---

## 14.35 显示器校准

**Route**：`/visual/calibration`  
**角色**：Administrator  
**前置条件**：Display 已打开；LIVE 只读  
**说明**：4K/LED 校准

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Safe Area Grid
- Color Bars
- Red/Gold Test
- Black/White Level
- Text Size
- Avatar Card
- Winner Card
- Motion Test

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
打开Calibration Scene
读取Display Profile
读取Safe Area
加载测试图
```

### Empty

标题：**尚未打开Display**

CTA：
- `打开大屏`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| CALIBRATION_SAVE_FAILED | 校准保存失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。

- LIVE：只读；导入/替换/删除/结构编辑禁止。

### Data / Command Boundary

- Query：`显示器校准ViewModelQuery`
- Command：`显示器校准Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| CAL-001 | 关键内容在Safe Area |



---

## 14.36 系统健康

**Route**：`/system/health`  
**角色**：Operator / Administrator  
**前置条件**：应用已启动  
**说明**：系统健康与阻塞状态

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 状态 | status | 90 | 是 | 是 | equals / in | left | 是 |  |
| 模块 | module | 160 | 是 | 是 | equals / in | left | 是 |  |
| 检查项 | check | 240 | 是 | 是 | contains |  | 是 |  |
| 当前值 | current | 220 | 否 | 否 | — |  | 是 |  |
| 阈值 | threshold | 180 | 否 | 否 | — |  | 是 |  |
| 级别 | severity | 90 | 是 | 是 | equals / in |  | 是 |  |
| 更新时间 | updatedAt | 180 | 是 | 是 | between |  | 是 |  |
| 操作 | actions | 140 | 否 | 否 | — | right | 是 |  |

**默认排序**：`severity DESC, module ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
检查Database
检查Schema
检查Integrity
检查Worker
检查Lottery
检查Display
检查Broadcast
检查WebGL
检查GPU
检查Storage
检查Audio
检查Backup
检查Lock
```

### Empty

标题：**尚未运行健康检查**

CTA：
- `运行检查`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| HEALTH_CHECK_FAILED | 健康检查失败 | 重试 |
| MAINTENANCE_REQUIRED | 需要维护 | 进入维护模式 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`系统健康ViewModelQuery`
- Command：`系统健康Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| HEALTH-001 | BLOCKED必须禁止抽奖 |



---

## 14.37 性能监控

**Route**：`/system/performance`  
**角色**：Administrator  
**前置条件**：Metrics 可读  
**说明**：FPS/延迟/GPU/内存

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| Metric | metric | 180 | 是 | 是 | equals / in | left | 是 |  |
| Current | current | 120 | 是 | 否 | — |  | 是 |  |
| Avg | avg | 120 | 是 | 否 | — |  | 是 |  |
| P95 | p95 | 120 | 是 | 否 | — |  | 是 |  |
| Threshold | threshold | 140 | 否 | 否 | — |  | 是 |  |
| Status | status | 110 | 是 | 是 | equals / in |  | 是 |  |

**默认排序**：`metric ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
初始化Metrics
读取Renderer
读取DB Latency
读取Worker
读取Broadcast
```

### Empty

标题：**暂无性能数据**

CTA：
- `开始采集`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| PERFORMANCE_DATA_FAILED | 性能数据读取失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`性能监控ViewModelQuery`
- Command：`性能监控Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| PERF-001 | 监控不上传网络 |



---

## 14.38 权限与用户

**Route**：`/system/users`  
**角色**：Administrator  
**前置条件**：User Store 可读  
**说明**：用户与角色

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 用户 | name | 180 | 是 | 是 | contains | left | 是 |  |
| 角色 | role | 140 | 是 | 是 | equals / in |  | 是 |  |
| 状态 | status | 100 | 是 | 是 | equals / in |  | 是 |  |
| 最后登录 | lastLogin | 180 | 是 | 是 | between |  | 是 |  |
| 权限摘要 | permissions | 260 | 否 | 否 | — |  | 是 |  |
| 操作 | actions | 160 | 否 | 否 | — | right | 是 |  |

**默认排序**：`name ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Users
读取Roles
计算Capabilities
```

### Empty

标题：**暂无用户**

CTA：
- `新增管理员`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| USER_ROLE_INVALID | 角色配置无效 | 修正角色 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`权限与用户ViewModelQuery`
- Command：`权限与用户Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| AUTH-001 | Operator直链被拦截 |



---

## 14.39 系统设置

**Route**：`/system/settings`  
**角色**：Administrator  
**前置条件**：Config Registry 可读  
**说明**：全局/项目/Event 配置

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 配置项 | label | 240 | 是 | 是 | contains | left | 是 |  |
| Key | key | 220 | 是 | 是 | contains |  | 否 |  |
| Scope | scope | 100 | 是 | 是 | equals / in |  | 是 |  |
| 当前值 | value | 220 | 否 | 否 | — |  | 是 |  |
| 默认值 | defaultValue | 220 | 否 | 否 | — |  | 是 |  |
| LIVE可改 | mutableDuringLive | 100 | 是 | 是 | equals |  | 是 |  |
| 需重启 | restartRequired | 100 | 是 | 是 | equals |  | 是 |  |

**默认排序**：`scope ASC, label ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取Config Registry
读取Project/Event override
计算Effective Value
```

### Empty

标题：**暂无可配置项**

CTA：
- `刷新`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| CONFIG_VALIDATION_FAILED | 配置值无效 | 修正字段 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`系统设置ViewModelQuery`
- Command：`系统设置Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| SETTINGS-001 | LIVE锁定项统一disabled |



---

## 14.40 诊断中心

**Route**：`/system/diagnostics`  
**角色**：Administrator  
**前置条件**：应用已启动  
**说明**：本地诊断与脱敏包

### Header / KPI / Actions

- KPI 按业务摘要实现，值来源必须来自 ViewModel，不在组件内二次计算。

### 筛选器

- 默认提供关键词、状态以及与本页主字段对应的枚举/日期筛选。
- 操作符必须使用列定义中的过滤操作符。

### 字段级列定义

| 列 | 字段 | 宽度 | 排序 | 筛选 | 操作符 | 固定 | 默认显示 | 说明 |
|---|---|---|---|---|---|---|---|---|
| 模块 | module | 160 | 是 | 是 | equals / in | left | 是 |  |
| 状态 | status | 100 | 是 | 是 | equals / in |  | 是 |  |
| 摘要 | summary | 320 | 否 | 是 | contains |  | 是 |  |
| 错误码 | errorCode | 180 | 是 | 是 | contains |  | 是 |  |
| 耗时 | duration | 100 | 是 | 否 | — |  | 是 |  |
| 操作 | actions | 140 | 否 | 否 | — | right | 是 |  |

**默认排序**：`module ASC`

**大数据规则**：记录 > 5000 时使用 `VirtualDataTable`；禁止把完整大表放入 DOM。

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
收集Build
收集OS
检测GPU/WebGL
检测DB
检测Storage
读取Logs
```

### Empty

标题：**尚未运行诊断**

CTA：
- `运行完整诊断`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| DIAGNOSTICS_FAILED | 诊断失败 | 重试 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`诊断中心ViewModelQuery`
- Command：`诊断中心Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| DIAG-001 | 诊断包默认脱敏 |



---

## 14.41 关于系统

**Route**：`/system/about`  
**角色**：Operator / Administrator  
**前置条件**：无  
**说明**：版本、Build、SBOM、License

### Header / KPI / Actions


### 筛选器

- 无通用表格筛选；按专用布局中的选择器实现。

### 主内容字段/区域

- Product
- Version
- Build ID
- Git Commit
- Lottery Engine
- Renderer
- Schema
- Protocol
- SBOM
- License
- Changelog

### Right Inspector

- 当前对象摘要
- Version / Revision / Hash（适用时）
- 引用/历史/状态
- 页面允许的安全动作

### 页面专属 Loading Phases

```text
读取BuildInfo
读取SBOM
读取License
读取Changelog
```

### Empty

标题：**版本信息不可用**

CTA：
- `刷新`

### 页面专属错误码

| 错误码 | UI标题 | 默认操作 |
|---|---|---|
| BUILD_INFO_MISSING | Build信息缺失 | 诊断 |

### 特殊状态

页面不重复全局状态矩阵，统一引用 `UI-SPEC-GLOBAL.md`。本页只声明专属差异。


### Data / Command Boundary

- Query：`关于系统ViewModelQuery`
- Command：`关于系统Command`
- 页面不得直接操作 Dexie。
- 写操作必须返回固定 errorCode，不根据异常字符串猜业务状态。

### 验收编号

| ID | 验收 |
|---|---|
| ABOUT-001 | 版本信息与实际Build一致 |

---

# 第十五部分：素材中心高级模块

## 15.1 资产分层

原子资产与组合资产必须分离：

```
Asset Center
├─ Atomic Assets
│  ├─ Image
│  ├─ Audio
│  ├─ Video
│  ├─ Texture
│  ├─ Font
│  ├─ 3D Model
│  ├─ Logo
│  └─ Avatar
│
├─ Scene Template Library
│  └─ 引用 Atomic Assets + Presets
│
├─ Prize Asset Library
│  └─ 引用 Atomic Assets + Prize/Batch
│
├─ Winner Card Templates
│  └─ 引用 Atomic Assets + Layout
│
├─ Theme
│  └─ 引用 Scene / Winner Card / Atomic Assets
│
└─ Animation Preset
   └─ 引用 Scene / Camera / Particle / Audio
```

禁止同一文件在 Theme、Animation、Prize 中重复保存。

Event Lock 时冻结：Project Revision / Asset Revision / SceneTemplate Revision / PrizeAsset Revision / WinnerCard Revision / Theme Revision / AnimationPreset Revision。

历史 Draw / Event Snapshot 始终引用 `assetId + assetVersion + assetHash`，而不是"当前最新版"。

## 15.2 素材智能检查器

检查项：低分辨率 / 超大图片 / 透明通道 / 异常色彩空间 / 音频峰值 / 视频编码 / 3D面数 / 纹理过大 / 字体缺字 / 重复素材 / 缺失许可证

输出：READY / NEEDS_OPTIMIZATION / BLOCKED

## 15.3 自动优化队列

可生成：WebP / AVIF / 4K Background / Thumbnail / Audio normalized copy / Video compatibility copy / Texture mipmap version / 3D optimized LOD

原始素材保留。

## 15.4 素材依赖图

视觉化：Asset → Theme → Animation → Prize → Event

删除前直观看到影响。

## 15.5 资源冲突检测

示例：
- 同一主题引用了两个版本的 Logo
- Event Snapshot 缺少 Scene Asset
- Prize 使用了已归档音频

## 15.6 许可证中心

每个素材记录：Source / Author / License / Usage / Attribution Required / Commercial Use

缺失 license 时标记 WARNING。

## 15.7 批量重命名

支持规则：prefix / suffix / 序号 / 分类 / 日期

仅改逻辑名称，不改 hash。

## 15.8 批量标签

选中多个素材添加标签：`+ 红金`、`+ 4K`、`+ Reveal`

## 15.9 素材比较

- 图片：A/B、像素尺寸、文件大小、版本、视觉对比
- 音频：波形、长度、响度
- 3D：面数、材质、纹理、GPU估算

## 15.10 资源预热

Event Mode 前：
```
扫描 Event 使用资源 → Critical Set → Preload → Decode → GPU Warmup
```
显示：`43 / 43 Critical Assets Ready`

## 15.11 素材健康评分

技术健康（非娱乐化星级）：完整性 / 兼容性 / 质量 / 引用有效性 / License 完整性

显示：正常 / 需优化 / 阻塞

## 15.12 Asset Center MVP 边界

### 15.12.1 MVP 范围内（Do）

- 图片/音频/视频/3D 模型/字体/Logo/头像导入与管理
- 素材分类、标签、搜索、筛选
- 素材健康检查与自动优化队列
- 素材依赖图与冲突检测
- 批量重命名与批量标签
- 素材比较（图片 A/B、音频波形、3D 面数）
- 资源预热与 Critical Set 管理
- 许可证记录与缺失警告
- Scene Template Library（引用 Atomic Assets + Presets）
- Prize Asset Library（引用 Atomic Assets + Prize/Batch）
- Winner Card Templates（引用 Atomic Assets + Layout）
- Theme（引用 Scene / Winner Card / Atomic Assets）
- Animation Preset（引用 Scene / Camera / Particle / Audio）

### 15.12.2 MVP 范围外（Don't）

- 不做自由 3D 编辑器（不替代 Blender/Maya）
- 不做 Shader 编辑器
- 不做 JavaScript 插件系统
- 不做 AE 式自由 Timeline 编辑（Animation Preset 使用受限 Timeline）
- 不做素材版本历史回溯（只保留当前版本 + 历史引用）
- 不做云端素材同步（V1.0 纯本地）
- 不做多人协作素材库

## 15.13 Event Lock 冻结清单

Event Lock 时冻结以下 12 项：

| # | 冻结项 | 说明 |
|---|--------|------|
| 1 | Project Revision | 项目配置版本 |
| 2 | Asset Revision | 素材库版本 |
| 3 | SceneTemplate Revision | 场景模板版本 |
| 4 | PrizeAsset Revision | 奖品素材版本 |
| 5 | WinnerCard Revision | Winner Card 模板版本 |
| 6 | Theme Revision | 主题版本 |
| 7 | AnimationPreset Revision | 动画方案版本 |
| 8 | Participants | 参与人员名单 |
| 9 | Prizes | 奖项配置（名额/批次） |
| 10 | Eligibility Rules | 资格规则 |
| 11 | Critical Settings | 关键抽奖设置 |
| 12 | Lottery Algorithm Version | 抽奖算法版本 |

冻结后任何修改需 Administrator 解锁 + 写入 OperationLog。

历史 Draw / Event Snapshot 始终引用 `assetId + assetVersion + assetHash`，而不是"当前最新版"。

---

# 第十六部分：备份、存储与安全

## 16.1 备份格式 V1

**文件扩展名**：`.lottery`

**ZIP 容器内容**：manifest.json, project.json, participants.jsonl, prizes.json, draws.jsonl, settings.json, assets/, audit/

```ts
interface BackupManifest {
  formatVersion: 1;
  appVersion: string;
  projectId: string;
  createdAt: number;
  files: { path: string; size: number; sha256: string }[];
}
```

**导入管道**：选择备份 → 读取 manifest → 验证 formatVersion → 逐文件校验 checksum → 导入到 staging DB/tables → 完整性检查 → 确认切换

**失败时**：当前项目不变。

## 16.2 自动备份触发

发布 Revision / Event Lock / 每次 LIVE Draw COMMIT / Event End / 重大配置变更前

**保留策略**：event-start、latest、previous、event-end

头像使用不可变资产存储 — 不必每次备份复制全部 10 万头像。

## 16.3 存储守卫

使用 `navigator.storage.estimate()` 和 `navigator.storage.persist()`。

显示：已用空间、可用空间、预估头像导入空间、预估备份空间、持久化存储状态。

阈值：Warning、Critical、Blocked。

Blocked 状态禁止：新的大规模导入、重建大 Atlas、创建可能失败的完整备份。

但空间不足 **不能回滚已提交的中奖记录**。

## 16.4 现场安全与防误操作

**必须**：
- 抽奖前双击确认
- 抽奖中禁止导入/删除/切换项目
- 紧急停止双击确认
- 清除项目强确认
- 数据恢复强确认
- 离开项目提示
- 浏览器刷新警告（壳层支持时拦截关闭）
- 大屏断开立即醒目警告
- 存储空间不足警告
- DB 异常阻止所有抽奖

**可选**：Operator 模式、Administrator PIN、维护模式

## 16.5 系统自检

启动 15 项检查：IndexedDB / Schema Version / Participants / Prizes / Draw Integrity / Asset Index / Worker / Web Crypto / BroadcastChannel / WebGL2 / GPU Renderer / Display Connected / Storage Quota / Backup Status / Project Lock

输出：SYSTEM READY 或 SYSTEM NOT READY（任何 P0 失败阻止抽奖）

## 16.6 错误系统

**错误码**：DB_OPEN_FAILED / DB_TRANSACTION_FAILED / DRAW_LOCKED / DRAW_INSUFFICIENT_CANDIDATES / DRAW_COMMIT_FAILED / DISPLAY_DISCONNECTED / DISPLAY_SYNC_FAILED / WORKER_NOT_READY / RENDERER_NOT_READY / IMPORT_PARSE_FAILED / IMPORT_VALIDATION_FAILED / BACKUP_CHECKSUM_FAILED / STORAGE_QUOTA_LOW / WEBGL_UNAVAILABLE

UI 显示中文消息（如"本地数据库写入失败，本轮抽奖未提交，请勿继续操作。"），不是通用英文"Something went wrong."

## 16.7 诊断包

`Support-Diagnostics.zip` 包含：app-info.json / build-info.json / system-info.json / gpu-info.json / performance.json / error-log.jsonl / database-schema.json / redacted-state.json

默认不包含：所有姓名、所有头像、所有工号、完整人员数据库。

提供脱敏诊断包用于技术支持。

---

# 第十七部分：现场运营与角色权限

## 17.1 角色

**Operator**：查看状态、选择奖项、开始抽奖、紧急停止、查看结果、重播。  
**Administrator**：导入、修改名单、修改奖项、发布、锁定/解锁、备份/恢复、系统设置、数据清理、完整性恢复。

可选：Administrator PIN。LIVE 模式自动切换为 Operator Mode。

## 17.2 Workspace / Published 数据集

正式活动不读取"正在编辑"的数据。

管道：Workspace → 编辑/导入/验证 → 发布 → Published Revision → Event Lock → LIVE

抽奖只读取 Published + Locked Revision。永远不读取 Current Editable Workspace。

## 17.3 Event Lock

正式活动前锁定：Participants / Prizes / Eligibility Rules / Critical Settings / Lottery Algorithm Version

锁定生成 `projectSnapshotHash`。DrawRecord 必须记录：projectSnapshotHash / projectRevision / participantsRevision / prizesRevision / settingsRevision

锁定后禁止：修改名单、删除人员、更改奖项名额、更改重复规则、更改资格、更改算法版本。

解锁需要 Administrator 权限 + 写入 OperationLog。

## 17.4 候选预检摘要

抽奖前显示：奖项名称、抽取人数、总人员、有效候选、排除已中奖、禁用数、其他规则排除数、Project Revision、Candidate Snapshot hash

支持查看资格规则和排除统计。正式操作页不默认展开所有候选姓名。

## 17.5 Event Mode / 一键现场模式

**进入**自动执行：验证 Published Revision → 锁定 Event → 创建 event-start 备份 → 切换 Operator Mode → 检查第二屏 → 启动 Display → 全屏 → 检查 Storage/DB/Worker/GPU/Audio/BroadcastChannel → 启用心跳 → 启用防休眠

成功 = EVENT READY

**退出**自动执行：结束事件状态 → 生成 event-end 备份 → 导出 winners.csv → 生成 Event Audit Package → 生成 Verification Report → 写入 EVENT_END → 释放现场操作锁

## 17.6 Event Audit Package

活动结束时生成：`Event-Audit-YYYY-MM-DD.zip`

内容：event.json / build-info.json / project-snapshot.json / revisions.json / prizes.json / eligibility-rules.json / draw-records.jsonl / winners.csv / operation-log.jsonl / hashes.json / verification-report.html

验证报告显示每 Draw 完整性（Project Snapshot / Candidate Snapshot / Algorithm / Winner Recalculation / Result Hash / Commit Hash）。

必须完全离线可打开。

## 17.7 Event Runbook / 应急矩阵

**活动前 30 分钟**：加载项目 → 系统健康 → 确认 Published Revision → 检查 Event Lock → 检查第二屏 → 检查分辨率 → 测试音频 → 演练 → 检查存储 → 确认备份

**活动前 5 分钟**：退出演练 → 进入 LIVE → 确认 Event Lock → 确认 Operator Mode → 确认 Display Ready → 确认 SYSTEM READY

**大屏黑屏**（如已 COMMITTED）：中奖者有效 → 恢复 Display → SYNC_SNAPSHOT → 继续。不重新抽奖。

**Control 崩溃**（如已 COMMITTED）：恢复 Control → 读取 Session → 读取 DrawRecord → 恢复结果。（如果 COMMIT 未完成且事务失败：无有效结果，重新 PRECHECK。）

**GPU 性能下降**：PerformanceGovernor 自动降级。不能更改 DrawResult。

**第二屏断开**：Control 红色警报，已提交结果保留，等待重连。

## 17.8 桌面运行时

推荐发行：`3D Lottery Studio.exe`

壳层：Tauri 2（优先）或 Electron。负责：主屏 Control、第二屏 Display、自动全屏、显示器枚举、显示器热插拔、防休眠、窗口恢复、崩溃处理、本地静态资源、禁止意外导航。

LotteryEngine / Database / Audit 不依赖壳层。保留浏览器模式用于开发/调试。

## 17.9 显示器热插拔

桌面运行时处理：第二屏拔出/插入、显示器 ID 变化、分辨率变化、DPI 缩放变化、投影仪重连。

提供：重新识别显示器。恢复后自动移动 Display 到目标显示器。

## 17.10 Safe Area / Overscan

Display 设置：Safe Area Top/Bottom/Left/Right，范围 0%-10%。

所有核心信息（奖项名称、中奖者头像、中奖者姓名、单位、最终结果）必须在 Safe Area 内。

## 17.11 轻量 Display 预览

Control 添加显示预览，但 **不得启动第二个完整 4K 3D 场景**。

预览使用轻量状态映射：Current Scene / Phase / Prize / Winner Layout / Display Connected / Performance Mode。

不得消耗显著 GPU。

---

# 第十八部分：4K 大屏视觉规范

## 18.1 Display 原则

Display：
```text
只负责演出
不决定中奖者
不计算资格
不修改数据库
不重新随机
```

结果来源：
```text
COMMITTED DrawRecord
```

## 18.2 全局 4K Safe Area

默认：
```text
Top 5%
Bottom 5%
Left 5%
Right 5%
```

所有关键文字/头像/奖项标题必须落在 Safe Area 内。

## 18.3 Display 状态机

```text
IDLE
PREPARE
ROLLING
SLOWING
REVEAL
CELEBRATION
RESULT_HOLD
FALLBACK
RECOVERING
```

## 18.4 IDLE

画面：
```text
活动 Logo
活动名称
副标题
深红背景
轻金粒子
轻微体积光
```

禁止：
```text
显示候选人敏感信息
高频闪烁
强霓虹
```

## 18.5 PREPARE

顺序：

```text
奖项名称进入
背景轻微暗化
Camera 聚焦中央
粒子密度上升
Rolling 音频预加载完成
```

时长建议：
```text
1.5s - 3s
```

## 18.6 ROLLING

内容：

```text
Avatar Universe
姓名/头像快速流动（仅视觉候选池）
中心主舞台
动态光环
```

注意：
```text
视觉候选池 != 抽奖算法候选池
动画不得决定结果
```

## 18.7 SLOWING

顺序：

```text
粒子减速
Camera 缓慢推进
非中奖头像降低亮度
中心区域聚焦
音频进入过渡
```

## 18.8 REVEAL

固定顺序：

```text
奖项名称
↓
金色聚光
↓
Winner Avatar
↓
Winner Name
↓
Organization / Department
↓
Honor Text
```

单人布局：

```text
头像 520-720px
姓名 96-132px
单位/部门 42-56px
奖项名 54-72px
```

4K 下最小关键字号：
```text
Name >= 84px
Organization >= 36px
Prize >= 48px
```

## 18.9 CELEBRATION

允许：
```text
金色粒子
红色粒子
金色光线
克制飘带
光环
星点
```

禁止：
```text
彩虹
电竞霓虹
大量emoji
卡通烟花
高频闪烁
```

## 18.10 RESULT_HOLD

显示：

```text
奖项
中奖者
单位/部门
Prize Asset（可选）
```

默认保持：
```text
10-30s
```

Control 可：
```text
继续
重播
结束本轮
```

不得：
```text
重新随机
修改winnerIds
```

## 18.11 多人布局

```text
1       → Hero
2-4     → 2×2
5-6     → 3×2
7-9     → 3×3
10-12   → 4×3
13-36   → 分页
37+     → Summary + 分批展示
```

## 18.12 Fallback Scene

触发：
```text
UI Runtime Error
WebGL部分失败
资源缺失
```

显示：

```text
活动 Logo
活动名称
"展示端正在恢复"
当前已提交奖项名称
```

不能：
```text
白屏
黑屏无提示
重新抽奖
```

## 18.13 WebGL Context Lost

状态：
```text
RECOVERING
```

流程：

```text
暂停 Timeline
保留 COMMITTED Draw
显示 Fallback
重建 Renderer
恢复 Atlas / Texture
恢复 Camera / Scene
继续 Presentation 或进入 RESULT_HOLD
```

## 18.14 音频缺失

如果：
```text
Audio Decode Failed
Device Lost
```

处理：
```text
继续视觉演出
Control 显示 Warning
Display 不弹系统错误框
```

## 18.15 Display 断连

Control：
```text
DISPLAY_DISCONNECTED
```

Display 重启：

```text
DISPLAY_READY
→ SYNC_REQUEST
→ SYNC_SNAPSHOT
→ 恢复当前 Scene/Draw
```

## 18.16 DRY_RUN 水印

右上固定：

```text
演练模式
DRY RUN
```

要求：
```text
远距离可见
不遮挡Winner
不与LIVE混淆
```

## 18.17 LIVE 标识

Display 不建议长期展示"LIVE"文字污染画面。

但 Debug Overlay / Operator Preview 中必须显示：
```text
LIVE
```

正式 Display 通过 Event Lock 与 Control 状态保证。

## 18.18 品牌配置

可配置：
```text
Logo
Activity Title
Subtitle
Organization
Background
Gold Tone
Red Tone
Footer
```

全部来自冻结 Theme Revision。

## 18.19 Display Loading

启动阶段：

```text
加载 Theme
加载 Scene
加载 Critical Assets
初始化 Renderer
初始化 Audio
连接 Control
同步 Event Snapshot
READY
```

禁止只显示空白屏。

## 18.20 Display Error 映射

```text
WEBGL_CONTEXT_LOST
ASSET_MISSING
AUDIO_DEVICE_LOST
DISPLAY_SYNC_FAILED
SCENE_INCOMPATIBLE
GPU_RESOURCE_LIMIT
```

每个错误必须定义：
```text
是否进入Fallback
是否影响已提交结果
是否可继续
是否要求Control介入
```

---

# 第十九部分：测试矩阵与验收标准

## 19.1 单元测试（12 个必须文件）

CandidatePool / DeterministicRng / UnbiasedIndex / LotteryEngine / DrawTransaction / ParticipantRepository / PrizeRepository / DrawRepository / BroadcastProtocol / StateMachine / BackupManifest / Hashing

## 19.2 集成测试

100k 参与者，抽取 1/10/30/100/1000，所有中奖者唯一，prize remaining 正确，事务回滚，相同 transactionId 返回相同结果，COMMITTED 后页面刷新，COMMITTED 后 Display 重启，重播不改变结果

## 19.3 故障注入（14 个必须场景）

1. 点击开始后立即刷新
2. 提交事务中异常
3. Rolling 中 Display 关闭
4. Reveal 前 Control 刷新
5. IndexedDB 写入失败
6. Quota 超限
7. Worker 崩溃
8. BroadcastChannel 消息丢失/乱序
9. 10 次快速重复点击
10. 同一消息发送两次
11. 过期 sequence 到达
12. 恢复损坏备份
13. checksum 错误
14. 存储空间不足时继续抽奖

## 19.4 长时运行测试

最少 **4 小时**。监控：FPS / JS heap / GPU 纹理数 / 活跃 RAF / 事件监听器 / worker 数 / IndexedDB 大小 / atlas 数

## 19.5 随机算法验证

脚本：`scripts/verify-randomness.ts`

检查：相同 seed = 相同结果、不同 seed = 不同结果、索引始终在范围内、rejection sampling 无低值偏、1,000,000 次小范围采样频率合理性、无 `Math.random()`

CI 规则：grep/lint 禁止生产抽奖模块中出现 `Math.random(`

## 19.6 性能验收

数据规模：100,000 参与者 + 100,000 头像元数据

- Control 首屏不加载所有头像 blob
- 100k 不进入 React 组件树
- 100k 不进入 R3F 对象树
- 抽奖计算不阻塞主线程
- 头像导入在 Worker 中
- 表格虚拟化
- Atlas/Texture 有上限
- 4 小时运行无持续线性内存增长

## 19.7 V1.0 最终验收清单

### 数据（5 项）
- [ ] 100k 导入
- [ ] CSV/XLS/XLSX
- [ ] 导入失败不污染
- [ ] 刷新不丢数据
- [ ] 迁移可升级

### 抽奖（14 项）
- [ ] 无 Math.random
- [ ] 256-bit seed
- [ ] 确定性流
- [ ] Rejection sampling
- [ ] Swap-and-pop
- [ ] candidateSnapshotHash
- [ ] resultHash
- [ ] commitHash
- [ ] algorithmVersion
- [ ] transactionId 幂等
- [ ] Draw Lock
- [ ] 原子事务
- [ ] 无重复中奖
- [ ] 重播不重新采样

### 双屏（8 项）
- [ ] READY
- [ ] 心跳
- [ ] sequence
- [ ] messageId
- [ ] ACK
- [ ] 快照同步
- [ ] 重连
- [ ] 过期消息保护

### 恢复（5 项）
- [ ] Control 刷新恢复
- [ ] Display 重启恢复
- [ ] COMMITTED 但未展示可恢复
- [ ] 紧急停止保留结果
- [ ] cleanShutdown 标志

### 3D（8 项）
- [ ] InstancedMesh
- [ ] Texture Atlas
- [ ] LOD
- [ ] Frustum Culling
- [ ] Camera Director
- [ ] Winner Reveal
- [ ] Celebration
- [ ] 资源释放

### 性能（7 项）
- [ ] 1080p/1440p/4K 60 目标
- [ ] SAFE ≥ 30
- [ ] 自动降级
- [ ] 4h 浸泡
- [ ] 无持续线性内存增长
- [ ] 抽奖计算不阻塞主线程
- [ ] 100k 不进入组件树

### UI（6 项）
- [ ] 红金政务风格
- [ ] Control/Display 明确区分
- [ ] 全中文
- [ ] 离线字体
- [ ] 远距离可读
- [ ] 无赌博/电竞/赛博朋克感

### 备份（5 项）
- [ ] manifest
- [ ] checksum
- [ ] schema version
- [ ] staging 恢复
- [ ] 损坏包不能覆盖当前项目

## 19.8 V1.3 P0 验收用例（21 项）

### A. 抽奖控制（4 项）

| ID | 验收 |
|---|---|
| AC-DRAW-001 | 连续点击10次只产生1个transactionId |
| AC-DRAW-002 | COMMITTED后刷新恢复原winnerIds |
| AC-DRAW-003 | Emergency Stop不回滚winner |
| AC-DRAW-004 | 候选不足时禁止开始 |

### B. 名单管理（3 项）

| ID | 验收 |
|---|---|
| AC-PEOPLE-001 | 100k导入不阻塞主线程 |
| AC-PEOPLE-002 | 导入失败不污染当前数据 |
| AC-PEOPLE-003 | LIVE时编辑按钮disabled |

### C. 素材库（3 项）

| ID | 验收 |
|---|---|
| AC-ASSET-001 | 删除被引用素材时显示依赖图 |
| AC-ASSET-002 | 缺失license显示WARNING |
| AC-ASSET-003 | Event Lock后素材不可替换 |

### D. Display（4 项）

| ID | 验收 |
|---|---|
| AC-DISPLAY-001 | Display重启后Snapshot恢复当前结果 |
| AC-DISPLAY-002 | WebGL Context Lost后进入Fallback |
| AC-DISPLAY-003 | 音频失败不阻止视觉演出 |
| AC-DISPLAY-004 | DRY_RUN水印远距离可见 |

### E. 权限（2 项）

| ID | 验收 |
|---|---|
| AC-AUTH-001 | Operator访问Admin路由被拦截并重定向 |
| AC-AUTH-002 | Operator菜单不显示Admin页面 |

### F. Maintenance（1 项）

| ID | 验收 |
|---|---|
| AC-MAINT-001 | Maintenance模式下所有写操作disabled |

### G. Error Mapping

所有 26 个错误码必须映射到中文UI标题和CTA操作（见第 12.14 节错误码映射表）。

### H. P0 完成门槛

21 项 P0 验收用例全部通过 = V1.3 UI 契约完成。

## 19.9 页面通用验收检查（14 项）

每个页面必须通过以下通用检查：

| # | 检查项 |
|---|--------|
| 1 | Loading Phases 完整显示 |
| 2 | Empty 状态有明确标题和CTA |
| 3 | Error 状态显示中文错误标题和CTA |
| 4 | Blocked 状态禁止关键操作 |
| 5 | LIVE 状态写操作disabled |
| 6 | DRY_RUN 状态显示水印 |
| 7 | Maintenance 状态所有写操作disabled |
| 8 | Permission Denied 重定向到 /overview |
| 9 | DataTable 支持虚拟滚动（>5000 行） |
| 10 | Right Inspector 显示当前对象摘要 |
| 11 | 写操作通过 Command 边界 |
| 12 | 写失败返回固定 errorCode |
| 13 | 关键写操作生成 OperationLog |
| 14 | 验收编号在页面文档中声明 |

## 19.10 领域验收详细用例

### A. 抽奖控制详细验收

**AC-DRAW-001 连续点击幂等**
- 操作：快速点击"开始抽奖"10次
- 预期：只生成1个transactionId，只产生1个DrawRecord
- 验证：DrawRepository.count() === 1

**AC-DRAW-002 COMMITTED 后刷新恢复**
- 操作：COMMITTED后刷新页面
- 预期：恢复原winnerIds，不重新抽奖
- 验证：DrawRecord.winnerIds 不变

**AC-DRAW-003 Emergency Stop 保留结果**
- 操作：Rolling中点击Emergency Stop
- 预期：已COMMITTED的winner保留，未COMMITTED的取消
- 验证：DrawRecord.status === "COMMITTED" 的winner不变

**AC-DRAW-004 候选不足禁止开始**
- 操作：候选 < 抽取人数时点击"开始抽奖"
- 预期：按钮disabled，显示"候选人数不足"
- 验证：UiCapabilities.canDraw === false

### B. 名单管理详细验收

**AC-PEOPLE-001 100k 导入不阻塞**
- 操作：导入 100,000 人 CSV
- 预期：主线程 FPS > 50，导入在 Worker 中完成
- 验证：performance.now() 差值 < 100ms（主线程）

**AC-PEOPLE-002 导入失败不污染**
- 操作：导入损坏 CSV
- 预期：IMPORT_VALIDATION_FAILED，当前数据不变
- 验证：ParticipantRepository.count() 不变

**AC-PEOPLE-003 LIVE 时编辑禁用**
- 操作：LIVE模式下点击"编辑"按钮
- 预期：按钮 disabled
- 验证：UiCapabilities.canEditParticipants === false

### C. 素材库详细验收

**AC-ASSET-001 删除被引用素材显示依赖图**
- 操作：删除被 Theme 引用的 Logo
- 预期：弹窗显示依赖图（Theme/Animation/Prize）
- 验证：DependencyGraph 正确显示

**AC-ASSET-002 缺失 license 显示 WARNING**
- 操作：导入无 license 的素材
- 预期：素材健康评分显示"需优化"，列表显示 WARNING 图标
- 验证：AssetHealth.licenseComplete === false

**AC-ASSET-003 Event Lock 后素材不可替换**
- 操作：Event Lock 后尝试替换素材
- 预期：替换按钮 disabled
- 验证：UiCapabilities.canManageAssets === false

### D. Display 详细验收

**AC-DISPLAY-001 Display 重启后 Snapshot 恢复**
- 操作：Display 断开后重连
- 预期：恢复当前 Scene/Draw，不重新抽奖
- 验证：SYNC_SNAPSHOT 消息正确

**AC-DISPLAY-002 WebGL Context Lost 后进入 Fallback**
- 操作：模拟 WebGL Context Lost
- 预期：进入 FALLBACK 状态，显示"展示端正在恢复"
- 验证：DisplayState === "FALLBACK"

**AC-DISPLAY-003 音频失败不阻止视觉演出**
- 操作：音频解码失败
- 预期：视觉演出继续，Control 显示 Warning
- 验证：AudioManager.state === "ERROR"，Display 正常

**AC-DISPLAY-004 DRY_RUN 水印远距离可见**
- 操作：4K 屏幕 5 米外观察
- 预期：水印清晰可见，不与 LIVE 混淆
- 验证：水印字体 >= 48px，位置右上

### E. 权限详细验收

**AC-AUTH-001 Operator 访问 Admin 路由被拦截**
- 操作：Operator 直接访问 /people
- 预期：重定向到 /overview，显示 PERMISSION_DENIED Toast
- 验证：OperationLog 记录 SECURITY_NAV_BLOCK

**AC-AUTH-002 Operator 菜单不显示 Admin 页面**
- 操作：Operator 查看侧边栏菜单
- 预期：只显示 7 个允许路由（见第 13.2.1 节）
- 验证：菜单项数量 === 7

### F. Maintenance 详细验收

**AC-MAINT-001 Maintenance 模式下所有写操作 disabled**
- 操作：Maintenance 模式下尝试导入/编辑/抽奖
- 预期：所有写按钮 disabled
- 验证：UiCapabilities 所有写能力 === false

---

# 第二十部分：开发阶段与执行指令

## 20.1 开发阶段（26 阶段，严格顺序）

| 阶段 | 内容 |
|------|------|
| PHASE 1 | 现有代码审计 |
| PHASE 2 | 构建修复 & 测试基线 |
| PHASE 3 | DB schema/迁移统一 |
| PHASE 4 | 100k 数据压力测试 |
| PHASE 5 | Import Worker |
| PHASE 6 | Image Worker / Asset Manager |
| PHASE 7 | 确定性 RNG |
| PHASE 8 | 无偏抽奖引擎 |
| PHASE 9 | Draw Lock + 原子事务 |
| PHASE 10 | 审计哈希 / DrawRecord |
| PHASE 11 | 状态机 |
| PHASE 12 | Broadcast Protocol V1 |
| PHASE 13 | Display 握手 / 快照同步 |
| PHASE 14 | 恢复 / 崩溃恢复 |
| PHASE 15 | 备份 / 恢复 |
| PHASE 16 | Renderer Resource Registry |
| PHASE 17 | Avatar Instancing / Atlas / LOD |
| PHASE 18 | Camera Director |
| PHASE 19 | Winner Reveal |
| PHASE 20 | 红金政务 Control UI |
| PHASE 21 | 4K 红金 Display UI |
| PHASE 22 | Performance Governor |
| PHASE 23 | 故障注入 |
| PHASE 24 | 4 小时浸泡测试 |
| PHASE 25 | 生产构建 |
| PHASE 26 | Event Runbook |

## 20.2 每阶段输出标准

每个阶段必须输出：

```
PHASE X COMPLETE
完成内容：...
修改文件：...
新增文件：...
删除文件：...
运行命令：...
测试结果：...
性能数据：...
发现问题：...
未完成项：...
下一阶段：...
```

禁止：只回复"完成"。禁止：只写示例代码不实现。

## 20.3 UI 开发优先级

| 优先级 | 页面 |
|--------|------|
| P0（9 页） | 系统总览、抽奖控制、大屏控制、名单管理、奖项设置、中奖记录、现场检查、系统健康、项目管理 |
| P1（8 页） | 导入中心、资格规则、候选预检、备份与恢复、素材库、场景模板库、主题与品牌、权限与用户 |
| P2（9 页） | 演练模式、批次与轮次、作废/补抽/重抽、抽奖详情、抽奖审计、独立验证、操作日志、活动管理、发布与锁定 |
| P3（其余） | 项目版本、归档与模板、奖品素材库、Winner Card 模板、头像资源、数据导入导出、存储管理、大屏设置、动画方案、音频设置、显示器校准、性能监控、系统设置、诊断中心、关于系统 |

## 20.4 页面组件规范

建议组件：
PageHeader / StatusStrip / KpiGrid / FilterBar / DataTable / VirtualDataTable / AssetGrid / RightInspector / EmptyState / LoadingState / ErrorState / BlockedState / ConfirmDialog / DangerDialog / LiveLockBanner

## 20.5 全局弹窗规范

危险弹窗必须包含：
- 标题
- 影响说明
- 不可逆/可恢复说明
- 二次确认

不能只写"确定吗？"

关键弹窗必须显示业务对象：项目 / Event / Prize / Draw ID / Participant

## 20.6 全局 Drawer 规范

Right Drawer：
- 宽 360-440px
- Header 固定
- Body 滚动
- Footer 操作固定

用于：人员详情 / 素材详情 / 奖项详情 / Draw详情 / 健康详情

## 20.7 全局 Table 规范

支持：固定表头 / 列显隐 / 列宽 / 排序 / 筛选 / 批量选择 / 虚拟滚动 / 导出当前结果

100k 页面不允许普通完整 DOM 表格。

## 20.8 页面完成定义

每个页面 Done = UI 结构 + 所有状态（Empty/Loading/Error/Blocked/LIVE） + 权限 + 数据契约 + 错误处理 + LIVE/DRY_RUN/Maintenance 锁定 + 审计事件 + E2E 测试

## 20.9 前端开发约束

开发人员不得自行发明：
- 页面结构
- 状态名称
- 按钮文字
- 权限规则
- 危险操作流程
- LIVE 锁定逻辑

如规格未定义，必须补规格后再实现。

页面不得直接操作 IndexedDB；通过 Repository / Service / Command 层。  
页面不得直接调用 LotteryEngine 内部方法；只通过应用服务接口。  
所有资产选择器只返回 `assetId + version + hash`，不返回任意绝对路径作为业务引用。

## 20.10 最终产品定义

**3D Lottery Studio V1.2 Unified** = Local-First + Offline + Auditable + Deterministic Verification + Transactional + Revisioned + Event-Locked + Dual-Screen + GPU-Accelerated + 4K Ceremony Display + Crash-Recoverable + Desktop-Deployable

**最终核心链路**：

```
Workspace → Validate → Publish Revision → Event Lock → Project Snapshot
→ Eligibility Engine → Candidate Snapshot → 256-bit Seed
→ Deterministic HMAC-SHA-256 Stream → Rejection Sampling → Swap-and-Pop
→ Winner IDs → Atomic COMMIT → Audit Hash
→ Broadcast Snapshot → 3D Presentation → Event Audit Package → Independent Verification
```

**核心原则**：抽奖引擎决定结果。数据库事务确认结果。审计层证明结果。展示引擎只演出。**任何视觉、窗口、GPU、音频或第二屏故障都不能改变已 COMMITTED 的结果。**

## 20.11 ViewModel / Command 边界

### 20.11.1 PageCommandResult 接口

```ts
interface PageCommandResult<T = void> {
  ok: boolean;
  errorCode?: string;
  data?: T;
  operationLogId?: string;
}
```

所有写操作必须返回此结构，不抛异常到 UI 层。

### 20.11.2 DrawControlViewModel 接口

```ts
interface DrawControlViewModel {
  // Read
  query(): Promise<{
    currentPrize: Prize;
    candidateCount: number;
    candidateSnapshotHash: string;
    preflight: CandidatePreflight;
    drawLock: DrawLock | null;
    systemHealth: SystemHealth;
    displaySnapshot: DisplaySnapshot;
  }>;
  
  // Command
  startDraw(): Promise<PageCommandResult<DrawRecord>>;
  emergencyStop(): Promise<PageCommandResult<void>>;
  replay(): Promise<PageCommandResult<DrawRecord>>;
}
```

### 20.11.3 Read / Write 边界

**Read（Query）**：
- Page → ViewModel.query() → Application Service → Repository → Database
- 不修改任何状态
- 可缓存
- 返回只读数据结构

**Write（Command）**：
- Page → ViewModel.command() → Application Service → Transaction → Database → OperationLog
- 必须显式事务化
- 必须生成 OperationLog
- 失败返回固定 errorCode
- 不抛异常到 UI

## 20.12 表单验证规则

### 20.12.1 Participant 字段验证

| 字段 | 规则 | 最小 | 最大 | 格式 |
|------|------|------|------|------|
| employeeNo | 必填 | 1 | 64 | 非空字符串 |
| name | 必填 | 1 | 80 | 非空字符串 |
| organization | 必填 | 1 | 120 | 非空字符串 |
| department | 选填 | 0 | 120 | 字符串 |
| email | 选填 | 0 | 254 | email 格式 |
| phone | 选填 | 0 | 32 | 电话号码格式 |
| title | 选填 | 0 | 80 | 字符串 |
| tags | 选填 | 0 | 20 | 标签数组 |

### 20.12.2 Prize 字段验证

| 字段 | 规则 | 最小 | 最大 | 格式 |
|------|------|------|------|------|
| name | 必填 | 1 | 120 | 非空字符串 |
| description | 选填 | 0 | 500 | 字符串 |
| totalCount | 必填 | 1 | 10000 | 正整数 |
| batchCount | 必填 | 1 | 100 | 正整数 |
| drawOrder | 必填 | 1 | 9999 | 正整数 |
| assetId | 选填 | — | — | UUID 格式 |

### 20.12.3 Eligibility Rule 操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `equals` | 等于 | `organization equals "技术部"` |
| `in` | 在列表中 | `department in ["前端", "后端"]` |
| `contains` | 包含 | `name contains "张"` |
| `startsWith` | 开头是 | `employeeNo startsWith "E"` |
| `not` | 否定 | `not (status equals "DISABLED")` |
| `and` | 逻辑与 | `rule1 and rule2` |
| `or` | 逻辑或 | `rule1 or rule2` |

### 20.12.4 Editor MVP 范围

**范围内**：
- 单字段编辑（文本/数字/日期/选择）
- 批量导入（CSV/XLS/XLSX）
- 字段验证
- 重复检测
- 资格规则可视化编辑

**范围外**：
- 自由 JavaScript 表达式
- 复杂嵌套逻辑（超过 3 层）
- 跨项目规则引用

## 20.13 共享组件清单（24 个）

| # | 组件 | 用途 |
|---|------|------|
| 1 | PageHeader | 页面标题 + 面包屑 |
| 2 | StatusStrip | 系统状态条 |
| 3 | KpiGrid | KPI 卡片网格 |
| 4 | FilterBar | 筛选器栏 |
| 5 | DataTable | 普通数据表（<5000 行） |
| 6 | VirtualDataTable | 虚拟滚动表（>5000 行） |
| 7 | AssetGrid | 素材网格 |
| 8 | RightInspector | 右侧检查器 |
| 9 | EmptyState | 空状态 |
| 10 | LoadingState | 加载状态 |
| 11 | ErrorState | 错误状态 |
| 12 | BlockedState | 阻塞状态 |
| 13 | ConfirmDialog | 确认弹窗 |
| 14 | DangerDialog | 危险操作弹窗 |
| 15 | LiveLockBanner | LIVE 锁定横幅 |
| 16 | ActionButton | 操作按钮 |
| 17 | KpiCard | 单个 KPI 卡片 |
| 18 | FilterInput | 筛选输入框 |
| 19 | FilterSelect | 筛选选择器 |
| 20 | FilterMultiSelect | 筛选多选器 |
| 21 | FilterDateRange | 筛选日期范围 |
| 22 | TableColumnSelector | 列选择器 |
| 23 | Drawer | 抽屉面板 |
| 24 | Toast | 消息提示 |

所有组件 Props 接口定义见第 12.11 节。
