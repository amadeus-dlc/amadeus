<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T04:55:00Z — 差分 base は直前 intent の observed(ad1ff5de9、非祖先)でなく、履歴候補から祖先かつ距離最小の 3b87d1027(距離16)を機械選定した; cid:reverse-engineering:rescan-base-ancestry の適用
- 2026-07-27T04:55:00Z — developer スキャン→architect 合成の直列2段で実行し、architect 段の独立再検証で scan-notes の2件(正本面コミット数 4→5、mirror.ts 縮小量)を訂正した; cid:reverse-engineering:c3(直列)+cite 照合の実効例
- 2026-07-27T04:55:00Z — architect が指示範囲外3ファイル(technology-stack/dependencies/business-overview)へ申告付きで追記した判断を、台帳様式(全 intent 1節)への準拠として受理した; GraphQL 不在の実測確定は本 intent の設計前提に直結するため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-27T04:55:00Z — 宣言センサー3種は codekb 出力が filter 構造不適合のため発火せず、代替検証(H2 数の機械確認: 9ファイル全て≥2、最小16 / 上流入力行 / 現在マーカー一意性 grep)を conductor 手動で実施した; cid:reverse-engineering:re-sensors-codekb-filter-mismatch / c3-codekb-sensor の適用。詳細は re-scans/260727-mirror-project-status.md § センサー不適用の記録

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
