# Build and Test Results — 260730-open-bug-batch-3

上流入力(consumes 全数): fix-1752-boundary-report-create / fix-1773-ballot-blind-storage / fix-1772-choice-description の各 code-generation-plan.md と code-summary.md — 本結果は各 unit の閉包テストを最終断面(origin/main 75367ba67 = 3 PR 全着地後)で再実行して確定した。測定 ref: ローカル実行はすべて main worktree HEAD 75367ba67。

## 実行結果(個別直書き・exit code 実測)

| 検証 | コマンド | exit | 備考 |
|---|---|---|---|
| 型検査 | `bun run typecheck` | 0 | |
| Lint | `bun run lint` | 0 | |
| 配布 drift | `bun run dist:check` | 0 | 7ハーネス OK |
| self-install drift | `bun run promote:self:check` | 0 | |
| 3バグ リグレッション | `bun test`(宣言7ファイル、実在 7/7 確認) | 0 | `Ran 178 tests across 7 files`(178 pass / 0 fail、宣言数と一致) |
| t258 単独再実行 | `bun test tests/integration/t258-lifecycle-transaction.test.ts` | 0 | 27 pass、28.7s(後述の flake 帰属) |
| GitHub push CI(最終断面) | run 30603987214(headSha 75367ba67) | success | Tests / Coverage Report (head/base) / drift / benchmark 含む全ジョブ green |

## Bolt 別の閉包(PASS / 各 PR の CI green + 本断面再実行 green)

- **#1752**(PR #1802、MERGED 2026-07-31T01:36:51Z): manual create 成功後の report create 受理+receipt 不在拒否の2ケースを `tests/integration/t265-engine-boundary.integration.test.ts` が固定。PASS。
- **#1773**(PR #1808、MERGED 2026-07-31T03:01:10Z): collecting 中の ledger 非出現・gitignore 実測・統合冪等性を `tests/integration/t373-election-ballot-blind-storage.integration.test.ts` が固定。PASS。
- **#1772**(PR #1809、MERGED 2026-07-31T04:22:24Z): view への question/description 搬送+BR-2 新契約を `tests/unit/t234-election-model.test.ts` / `tests/integration/t236-election-loop.integration.test.ts` が固定。PASS。

## 帰属を確定した既知 flake(スコープ外・修正せず記録)

- push CI run 30600486319(headSha 25f54b066 = #1808 マージ直後)の赤は `tests/integration/t258-lifecycle-transaction.test.ts` の1件のみ — assertion 実文「records 100-child p95 ... this test timed out after 120000ms」= 性能ベンチマークの CI ランナー負荷起因タイムアウト。#1808 の変更ファイル(election-store)と交差ゼロ、ローカル単独 28.7s で 27 pass、次断面 75367ba67 の CI では同ジョブ green — 環境起因 flake と確定(cid:code-generation:local-ci-red-assertion-verbatim / cid:build-and-test:bt-20260730-2 準拠)。背景要因として #1811(safety-wait supervisor 孤児蓄積、P1/S2)が別 Issue で追跡中。
- formal-model-check は本スコープ非実行(advisory のみ)。TLA model-map は #1808/#1809 で sha256 再ピン済み・formal-verif 系テストは各 PR 断面で green(#1510 暫定運用準拠)。

## 判定

PASS — 3バグとも閉包テストが最終断面で green、全ゲート(型・lint・drift・coverage patch・complexity・CI)成立。未検証面の明示: 実運用セッションでの選挙 view 消費(投票者 UX)と prompt モード mirror boundary の実運用再現は本バッチではテスト経由で検証しており、次回実選挙・実 boundary 通過が実運用面の初観測になる(cid:build-and-test:verdict-names-unverified-facets)。
