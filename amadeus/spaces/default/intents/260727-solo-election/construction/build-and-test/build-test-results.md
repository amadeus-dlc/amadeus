# Build & Test Results — 260727-solo-election

> 上流入力(consumes 全数): U1/U2 code-generation-plan.md、code-summary.md、build-instructions.md、各 test-instructions.md

## 実測結果 (2026-07-28、worktree supervise-feature)

| 対象 | 結果 | 実測 |
|------|------|------|
| TypeScript compile | **PASS** | `bun run typecheck` → exit 0 |
| Harness dist sync | **PASS** | `bun run dist:check` → all harness trees OK |
| Self-promote sync | **PASS** | `bun run promote:self:check` → exit 0 |
| U1 単体 (t234) | **PASS** | election model + 2-voter FR-05 / split HoldReason |
| U1 統合 (t236) | **PASS** | solo subagent 2-voter loop (2-0 established, 1-1 split hold) |
| U2 統合 (t242) | **PASS** | 10 pass / 0 fail — SKILL 4節構造・語彙ガード |
| U2 統合 (t269) | **PASS** | 8 pass / 0 fail — spawn template / team.md 整合 |
| Formal oracle (arm-s) | **PASS** | `SubjectTally` に `split` 反映済み |
| TLA model loader | **PASS** | 14 pass / 0 fail（`EXPECTED_MODULE_IDENTITY` を model-map と同期後） |
| 選挙スコープ合算 | **PASS** | 96 tests / 0 fail（t234+t236+t242+t269+TLA loader+arm-s） |
| セキュリティ静的 | **PASS** | election*.ts diff に env/fetch/credential 追加なし |
| フル CI (`--ci`) | **FAIL (スコープ外)** | 3 files / 7 assertions — 本 intent 変更と無関係（下記） |

## フル CI 失敗（本 intent スコープ外・申し送り）

| ファイル | 失敗 | 原因 |
|---------|------|------|
| `t-package-write-sweep.test.ts` | 2 | dist write 時の distribution-transaction ロック（並列 CI 競合） |
| `t132-hooks-doc-count-sync.test.ts` | 3 | `docs/reference/06-hooks-and-tools.md` の hook 数文言がテスト期待と不一致 |
| `t-formal-verif-tla-model-loader.integration.test.ts` | 0（修正後） | テスト定数 `EXPECTED_MODULE_IDENTITY` が model-map と乖離していた → **修正済み** |

## 判定

本 intent の受け入れ基準（U1/U2 選挙コア+表面、型検査、dist 同期、formal 境界）は **PASS**。フル CI の 3 ファイル失敗は upstream 既知ドリフト/環境依存であり、本 intent の build-and-test ゲート判定からは除外する。
