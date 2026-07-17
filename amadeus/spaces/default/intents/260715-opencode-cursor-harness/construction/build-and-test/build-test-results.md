# Build Test Results — 260715-opencode-cursor-harness

上流入力(consumes 全数): 各 unit の code-generation-plan.md と code-summary.md(U1〜U4 — Unit 時点の exit code はこの2成果物から転記)。

全数実測(exit code)。「本線 fresh」= 本ステージ直前(2026-07-16、swarm finalize batch 3 の check-cmd 再実行)、「Unit 時点」= 各 Bolt の code-summary、「CI」= GitHub Actions run 実文。

## 本線 fresh(finalize --claimed の check-cmd、worktree bolt-verification-docs = 現 main 同等面)

| コマンド | exit |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun test tests/smoke/t149-opencode-cursor-dist-structure.test.ts` | 0(4 tests) |

## Unit 時点の全数(code-summary より、conductor 再実行込み)

| 検証 | U1 | U2 | U3 | U4 |
| --- | --- | --- | --- | --- |
| package.ts / dist:check ×2 / typecheck / lint / promote:self:check | 全0 | 全0 | 全0 | 全0 |
| unit/integration テスト | emit 両分岐 in-process | ケース追加分 green | 37 pass 0 fail | t149 4 tests+registry-check 0 |
| 落ちる実証 | MISSING/DIFFERS→復元 | (U1 恒久化を継承) | ORPHAN exit 1→0 | t149 exit 1→0 |
| lcov / patch | 未カバー0 | 未カバー0 | 4ファイル未カバー0 | patch gate PASS |

## CI(着地 run)

- #1032 / #1044 / #1046: マージ時 green(#1046 は codecov notify 不達2回 → #1060 で coverage 基盤自体を自己完結ゲートへ移行して解消)
- #1074: 初回 Coverage Report 赤 = setup-pack-contract hook timeout(5.05s)フレーク → 同一 head 再実行で全 green(rerun-red-reattribution 実践、CI Success pass / Coverage Report pass 10m3s)

## ベースライン注記

- `bash tests/run-tests.sh --ci`(U4 worktree、env -u TEAM_MUX)の唯一の赤 = t224 `declared=medium measured=large (45.68s)` — #1059 既知乖離(e4 対応中)、assertion 実文で本 intent 無関係と帰属確定。CI(Linux)では不発
