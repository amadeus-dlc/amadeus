<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-16T12:45:00Z — 差分リフレッシュの base に `83e1dbee`(re-scans/ 最新 record 260815-stale-epoch-landed の observed、HEAD の祖先であることを merge-base で実測)を選定; 本 intent は初回スキャンのため stage 規定「newest observed across re-scans/」を適用。observed = `5c5911ee3`(HEAD = origin/main 一致断面)
- 2026-08-16T12:45:00Z — depth Minimal に合わせ、スキャン範囲を差分 28 コミット/399 ファイルの棚卸し + 対象 3 bug 領域(promote-self/pi、no-silent-drop bootstrap、07-sensor-system)の深掘りに限定; 全量再スキャンは行わない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-16T13:35:00Z — RE の中核知見 3 点は requirements-analysis で Issue 本文の期待結果を上書きしうる: (1) #3097 の同期先は 14 でなく matches 宣言 13 件 + 既存 2 行の値陳腐化 (2) #2162 は起票時 3 不整合中 2 つが台帳移行(#2338/#2353)で消滅済みで、実体は postRevision 到達性検査の不在と baselineAtRevision の死経路の 2 点 (3) #2363 の実害は §12a reviewer read-only allowlist の未配布 1 点(model ピンは driver fallback で有効、外部導入経路は無傷)
- 2026-08-16T13:35:00Z — oq-singleton の申し送り(scan record §4)は本 intent では recompose 済みの units-generation / delivery-planning EXECUTE 構成で回避済み。Architect が Developer 実測を 1 件訂正(RFC-0001 unit 数 11→13、結論への影響なし)
