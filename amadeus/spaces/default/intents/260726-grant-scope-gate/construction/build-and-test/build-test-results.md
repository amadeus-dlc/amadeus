# Build & Test Results — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

実行日: 2026-07-26(B&T ステージでの新鮮実行。code-summary.md 記録の CG 段実測とは独立の再実行)
測定 ref: ブランチ worktree-1497-standing-grant-scope-gate、HEAD = 実装コミット bcf4e9ff8

## 結果(全コマンド個別実行、exit code はコマンド出力からの転記)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | |
| `bun run lint` | 0 | 307 warn / 19 info = 既存ベースライン(CG reviewer 実測と一致) |
| `bun run dist:check` | 0 | 6 harness OK |
| `bun run promote:self:check` | 0 | |
| `bash tests/run-tests.sh --ci` | 0 | RESULT: PASS、TOTAL 136 suites / 504 files 区分表、fail 0 |
| 対象 5 ファイル個別再検証 | 0 | 144 pass / 0 fail / 274 expect、`Ran 144 tests across 5 files`(宣言 5 = 実行 5) |

## 落ちる実証(CG 段実測の転記)

- 修正前 RED: `bun test tests/integration/t-standing-grant-composed-scope.test.ts` = exit 1(8 pass / 9 fail)
- 修正後 GREEN: 同 = exit 0(17 pass / 0 fail)

## 検証した面と検証していない面(verdict の書き分け)

- **検証済み**: composed / stock スコープの gate 分類(in-process、実 stage-graph + 実 scope-grid)、fail-closed、walking-skeleton 除外、team-mode 分類の parity、配布 11 面同期、patch coverage(lcov DA 直読で diff 追加行未カバー 0、CG 段実測)
- **未検証(明示引き継ぎ)**: 実運用 intent での end-to-end グラント消費(grant 発行 → gate-start → approve の実 CLI 連鎖)は Issue #1497 の再現 intent(260726-metrics-visualization)での検証が PR 着地後に可能 — in-process 最小再現(Issue 記載プローブと同型)はテストで固定済みのため、条件付きで READY とする

## CI 注記

wall-clock drift 2 件(t-codex-hooks-migration 39.2s / t225 30.5s、declared=medium measured=large)は本変更と無関係の負荷起因 advisory(RESULT: PASS 内)。
