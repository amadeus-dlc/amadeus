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

- 2026-07-25T06:28:30Z — Interpretations: npm インストーラの kimi 列挙対応(M5)は公開契約の完結として Must に含め、外部プロジェクト導入の実機 E2E のみ Won't(W5)に分離した(intent-capture Q1=A と scope-definition:c2 の整合)
- 2026-07-25T06:28:30Z — Interpretations: 質問は swarm 有効化とセッションスキル同梱の2問に限定。順序付け・MoSCoW 構造は既定規則(c2/c3)から導出可能なため問わなかった
- 2026-07-25T06:28:30Z — Tradeoffs: M2 を M2a(live capture + 骨格)/M2b(完成 + 契約テスト)に分割し、最大リスク R1 を最前列に配置(dependency-first + risk-first)
