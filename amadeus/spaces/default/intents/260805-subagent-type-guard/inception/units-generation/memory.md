<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-05T17:00:00Z — Unit 分割は AD の依存グラフから 3 Unit(U1 detection-skeleton / U2 model-attribution / U3 subagent-stats)。検出と記録の不可分境界(cid:units-generation:c1)により U1 が純関数層 + completed 配線を併せ持つ。U3⊥U2 の独立は ADR-5(属性不在 = unresolved)への接地で成立。
- 2026-08-05T17:02:00Z — edge block の正書式は `- name: X / kind: <UNIT_KINDS> / depends_on: [...]` の入れ子形(parseBoltDag 実装 + required-sections センサーの kind 必須検査を実測)。初稿のフラット形(units リスト + depends_on マップ)は malformed、kind 欠落は missing_unit_kinds で FAILED — 2段の是正で PASSED。
- 2026-08-05T21:40:00Z — reviewer i1(2体)の stall の真因は**セッションレート上限**と確定(i1b が「You've hit your session limit · resets 3:10am」で failed)。リセット後の i1c は約2分で READY を返した。ad-reviewer-i1 の stall も同根の可能性が高い(E-STG-S13E で persist した配送2経路の知見は上限起因の stall にも有効だった)。

## Deviations
- 2026-08-05T21:42:00Z — reviewer FOLLOW-UP(unit-of-work.md 本文への kind 明記がステージ契約の字面要求)を conductor が軽微是正(3 Unit 節へ kind 行を追加、センサー再発火 PASSED)。BLOCKER ではないため iteration 2 は消費していない。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
