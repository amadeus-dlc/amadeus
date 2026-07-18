# Build & Test Results — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): 3 unit の code-generation 成果物(`code-generation-plan.md`・`code-summary.md` ×3)、`requirements.md`、`unit-of-work.md`。

## 実測結果(2026-07-18、本線 = origin/main c0f144338 取込済みツリー、conductor 実行)

| 検証 | コマンド | exit |
|---|---|---|
| 依存導入 | `bun install --frozen-lockfile` | 0 |
| 型検査 | `bun run typecheck` | 0 |
| lint | `bun run lint` | 0 |
| dist drift | `bun run dist:check` | 0 |
| self-install drift | `bun run promote:self:check` | 0 |
| フル CI | `bash tests/run-tests.sh --ci` | 0(RESULT: PASS、wall-clock drift 0) |

## 受け入れ trace(`requirements.md` / `unit-of-work.md`)

- FR-1/FR-2/FR-4: t233(16セル matrix・negative)green — `code-summary.md`(U1)の受け入れと一致
- FR-1 prose/FR-3/FR-5/FR-8: t181 green+headless 記述 0+旧 1 記述 0 — `code-summary.md`(U2)と一致
- FR-7: t134/t135/t207/t211 green(referee 回帰)
- FR-9/FR-10: docs gate t174 green・16セル表同値照合・dist/promote check 0 — `code-summary.md`(U3)と一致
- 各 Bolt の落ちる実証・patch gate・lcov は Bolt 時点で実測済み(`code-generation-plan.md` ×3 の記録どおり)。CI 上の codecov 判定は各 PR で green マージ済み

## 判定分類(deployment-execution:c3 様式)

- PASS: 上記全件(実行証跡ベース)
- N/A: performance/security の専用テスト(各 instruction の反証可能根拠どおり)
- PENDING/NOT EXECUTED: なし
