<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-15T08:20:00Z — 差分リフレッシュの base は本 intent の prior re-scan record 不在のため、re-scans/ 中の最新 observed(260815-priority-bug-batch-2 の 9ba8170bb)を採用; git merge-base --is-ancestor で HEAD の祖先を実測(exit 0)。observed = origin/main tip 78146f435a(cid:reverse-engineering:c1 準拠)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-15T08:20:00Z — depth Minimal のため base..observed 差分(103 files — コード実体は PR #3101 の 3 tools + tests、docs 2 面、plugins 3 面)+ #3099 患部(orchestrate / unit-pool-runtime / per-unit-consume-fanout / construction-outcome-projection)へスキャンを絞る; #3099 はクロスレビュー 2 名の file:line 実測が既にあり、スキャンは現況確認と差分吸収を主とする

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-15T08:35:00Z — 患部 5 ファイル(orchestrate / unit-pool-runtime / per-unit-consume-fanout / construction-outcome-projection / audit)は base..observed で不変を実測(git diff --name-only 9ba8170bb..78146f435a -- <5paths> → 空出力・exit 0)。#3099 クロスレビュー(凍結 1fc4ad83f)の file:line 証拠は observed 断面でも current — requirements-analysis でそのまま引用可
- 2026-08-15T08:50:00Z — Developer scan が再現条件を特定: amadeus-lib.ts:8416 の early return(`pendingBatch.units.length < 2` → ok)により、幅1 batch は autonomy 設定に関わらず plan-integrity redirect を素通りして per-unit dispatch に落ちる。クロスレビュー R1 の未解決点(なぜ swarm でなく per-unit か)への回答。受け入れ基準に幅1条件の明記が必要
- 2026-08-15T08:50:00Z — scan の追加所見: 患部は「pool に書かない」でなく「outcome 読み口の2系統分裂」(fanout のみ 5 イベント中 1 イベント)。修正方式の比較では canonical projection へ寄せる案が既存構造と整合的だが、(a)/(b)/(c) の選定は選挙事項として保留。batch 所属フィルタ(orchestrate.ts:2461-2463)の意味論保存が制約
