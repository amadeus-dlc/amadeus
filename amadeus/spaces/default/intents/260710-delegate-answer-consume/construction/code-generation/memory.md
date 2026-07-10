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
- 2026-07-10T03:40:00Z — Interpretation: bugfix scope は functional-design をスキップ — requirements の FR-1「用語の分離」(2述語+per-delegate 枠)が設計仕様を兼ねる。単一ユニット delegate-consume-fix。プラン承認は auto-gate ノルムで続行。
- 2026-07-10T03:40:00Z — Interpretation: 実装アルゴリズム(per-kind 境界): delegation の gate 枠は「その delegation より後に GATE_APPROVED/REJECTED が無い」で未消費と導出、answer 枠は「後に QUESTION_ANSWERED が無い」で導出(ledger スキャン、新規オンディスク状態なし)。HUMAN_TURN の意味論は全 resolution が消費で不変。verb 無し呼び出し(発行側 grounding)は現行挙動を維持(Q3=A)。
- 2026-07-10T04:05:00Z — Deviation: reviewer READY の非ブロッキング指摘(state.ts の旧 uniform 境界コメント)を PR 前に是正(挙動を変えた当該箇所の説明文のため surgical 範囲内と判断)。dist 再生成込み、全検証 exit 0 再確認。
- 2026-07-10T04:05:00Z — Open question: #755(幻影 HUMAN_TURN)は本修正の HUMAN_TURN 分岐と delegate 発行 grounding の信頼根を汚染する上流バグ — 本 intent と直交だが、#755 修正まで presence 保証は名目化しうる(クロスレビューで指摘済み)。
