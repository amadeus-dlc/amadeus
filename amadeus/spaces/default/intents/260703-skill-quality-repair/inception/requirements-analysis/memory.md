<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-04T00:05:00Z — #341 を Intent の受け入れ条件から除外した; 完了済み Intent（amadeus-skill-english-rollout-plan、#399 系）でほぼ実施済みと確認したため。残日本語 3 skill の判定は言語 policy 観点の監査に含め、消化済みなら #341 の close を提案する。
- 2026-07-04T00:05:00Z — ステージ skill 38 個は「監査して問題を記録するだけ」とし、修正対象を非ステージ skill に限定した; 上流 parity 契約（適応点は改名と grilling 結線に限定）との衝突を避けるため。#405 の生成規約は amadeus-grilling 側の共通テンプレートとして置くことで、ステージ skill 本文を変えずに結線できる。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-04T00:20:00Z — aidlc-learnings.ts surface が memory_entries_total=0、phase="spaces" を返した; memory.md には Interpretations 2 件が存在するため、record path の解決に異常がある可能性がある。#340 の監査とは別件のツール不具合候補として次回確認する。
