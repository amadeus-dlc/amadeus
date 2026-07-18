# Component Methods — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

detailed business rules(表の各セル・エラーメッセージ文言)は Functional Design で確定する。ここでは公開面の signature と error 方針のみ定める。

## C1: Driver Contract

### 型(確定 — FR-4)

```ts
type DriverName = "subagent" | "claude-ultra" | "codex-ultra";  // ultracode を置換
const DRIVER_VALUES: DriverName[] = ["subagent", "claude-ultra", "codex-ultra"];
type HarnessName = "claude" | "codex" | "kiro" | "kiro-ide";     // dispatch 指示を持つ consumer のみ(FR-9: opencode/cursor 対象外)
```

### 解決関数(中核 signature+公開形 — 確定、Q1 裁定 A)

```ts
type DriverResolution =
  | { kind: "selected"; driver: DriverName }                     // 有効値がそのまま成立
  | { kind: "degraded"; driver: "subagent"; requested: DriverName } // 他ハーネス専用値の loud-degrade
  | { kind: "rejected"; raw: string; reason: "unknown-value" };  // 旧値 1・未知値の fail-closed

function resolveDriver(raw: string | undefined, harness: HarnessName): DriverResolution;
```

- 純関数(env 読み・I/O なし — 判別 union の Result 様式は project.md 既決 style に整合)。env 読みは `resolve` サブコマンド(CLI 面)が所有
- error 方針: `rejected` は例外でなく判別 union で返し、CLI 面が exit 1+stderr へ写像(fail-fast、副作用前 — FR-2)。数値・文言の詳細は FD
- Q1 裁定 A(E-SDE-AD 00:05:37Z、3/3 全 GoA 1): `amadeus-swarm.ts resolve --harness <name>` が env を読み `DriverResolution` を JSON で stdout(selected/degraded は exit 0 / rejected は exit 1+stderr)。決定ロジックは exported 純関数 `resolveDriver` に置き CLI は薄い写像に留める

### prepare 拡張(確定)

- `--degraded-from <driver>` の許容値を三値 `DRIVER_VALUES` へ(:402-407 の既存検証パターンを継続。不正値は既存どおり fail)

## C2: Degradation Audit

```ts
function emitSwarmDegraded(batch: string, requested: DriverName): void; // Fallback driver は "subagent" 固定(:291 維持 — ADR-3)
```

## C3〜C5: Conductor Wiring(prose — メソッドなし)

- SKILL 手順契約: (1) dispatch 前に `resolve --harness <self>` を実行(Q1 裁定 A)(2) resolution に従い fan-out(3) degraded なら利用者向け1行表示+`--degraded-from <requested>` を prepare へ(4) rejected なら停止(worktree/spawn/SWARM_STARTED ゼロ — FR-2)

## C7: Test Surface(検証メソッド面)

- matrix: `resolveDriver` の 4 入力状態 × 4 harness 全セル(FR-1 表と同値)を in-process で検証(spawn-blindspot 回避 — seam export 済みの純関数を直接呼ぶ)
- negative: rejected 経路で prepare 不実行・audit 無記録・worktree 差分ゼロ
- 回帰: t134/t135 は新語彙で green、t28 は enum 無変更を確認
