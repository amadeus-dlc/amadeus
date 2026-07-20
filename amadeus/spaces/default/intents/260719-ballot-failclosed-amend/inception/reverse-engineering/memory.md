<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- [2026-07-19T20:20Z] Interpretation: diff-refresh base は rescan-base-ancestry に従い自ツリー HEAD 祖先・距離最小の 591b6a2a2(距離65)を採用。非祖先 observed 18件は --is-ancestor exit 1 で除外 — 既存 cid の適用実例。
- [2026-07-19T20:20Z] Interpretation: RE 宣言センサーは codekb 出力の filter 構造不適合(re-sensors-codekb-filter-mismatch)につき conductor 手動確認で代替 — body 9+re-scan+timestamp+scan-notes 実在・最新バナー1件・marker 0 を機械確認。
- [2026-07-19T20:20Z] Interpretation: Architect が timestamp の降格対象を指示文言(260719-cursor-complete-clear)でなく実ディスク最新(260718-election-ts-foundation)へ訂正 — 並行 intent の re-scans が自ツリー未着のため。record-sync 後の後続 intent が re-timestamp-merge-resolution で定型解消する前提を re-scan に明記済み。
- [2026-07-19T20:20Z] Tradeoff: architecture.md への追記は見送り(選挙 CLI 節が不在で新設は churn) — 受理境界 fail-open の知識は re-scan と scan-notes に集約(c1 適用)。
- [2026-07-19T20:20Z] Interpretation: 主要新事実 = (a) amend 投入経路の構造的不在(model.ts:194 kind 固定) (b) tally 二重計上は verify でも検出不能(同一母集団 recompute) (c) 実データは amend/late ゼロ世代 — いずれも requirements の一次材料として scan-notes へ。
