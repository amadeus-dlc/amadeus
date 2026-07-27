<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T11:45:00Z — 質問は真の未決4問(CI トリガー / baseline 境界定義 / E2E ハーネス範囲 / 到達検証深度)に限定。#1575/#1585 の修正方向は既存の流儀(canonical 1定義・canonical レンダラ)から一意のため質問化せず(cid:requirements-analysis:c5 / no-election-for-decided-norms)。4問とも AskUserQuestion 直接裁定(ソロモード)で A 採用、承認 TS 2026-07-27T11:37:24Z を questions ファイルへ記録
- 2026-07-27T11:46:00Z — requirements 冒頭に承認系譜(birth→バッチ拡張→Q1-Q4 裁定)を申告段落として記載(cid:requirements-analysis:approval-lineage-citation)。Q3=A による元 FR-2 からのスコープ縮小(claude 面限定・marketplace 除外)は Out of Scope に裁定引用つきで宣言

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-27T11:47:00Z — センサー3種を成果物生成直後・reviewer ディスパッチ前に手動発火(cid:functional-design:sensor-before-reviewer)。5発火全 PASSED を audit 行で確認(answer-evidence の requirements.md は filter **/*-questions.md 不適合の matches-rejection = 正常)。verdict は exit code でなく audit の SENSOR_PASSED/FAILED 行で判定

- 2026-07-27T12:05:00Z — reviewer(product-lead)verdict: 条件付き READY(GoA 3)。是正4点(テスト引用のフルパス化×2 = cid:requirements-analysis:mechanism-cite-verify-at-draft E-FSPRAS13 追補の違反実例(t299 2件・t209 4件の同番号共存を reviewer が実測)、.test 拡張子補完、projections.ts MIRROR_SURFACE_IDS のスコープ外宣言追加)を適用。是正前に全引用先の実在を独立再実測(sed 直読)してから編集(fix-diff-independent-reverify)。あわせて前提1へ reviewer 実測(emitComposedPluginStageIfInstalled は flags.stage 必須 = opt-in reach が正規経路、amadeus-orchestrate.ts:1017-1022)の精密化を追記 — Q4=A 裁定の充足経路を builder が誤読しないため
- 2026-07-27T12:06:00Z — 是正後センサー再発火含め全 SENSOR_PASSED 7件・FAILED 0件(audit 行実測)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
