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
- 2026-07-10T03:25:00Z — Interpretation: Issue 本文の方式 A/B/C は #685 実装前の枠組みのため、post-#685 の現行コード実測(verb スコープは delegation の human 行為判定のみ制御、resolution は verb 非依存)に基づき Q1 を再フレーム(種別スコープ消費/verb 時 QA 除外/QA 全除去/運用のみ)。
- 2026-07-10T03:25:00Z — Interpretation: Q2(delegate×answer の粒度)を独立質問化 — conductor に HUMAN_TURN が無い以上 answer は delegate を根拠にせざるを得ず、無制限 answer(autopilot インタビュー)を許すかは安全性の設計判断のため。
- 2026-07-10T03:35:00Z — Deviation: reviewer 1回目 NOT-READY(重大1: Q1/Q2 の「消費」概念混在)→ grounding(許可)と resolution(境界前進)の2述語分離で是正、2回目 READY。教訓: 選挙の選択肢文言に同一語の多義が潜むと、多数決成立後も requirements で矛盾として顕在化する — 選択肢起草時に概念の粒度を揃える。design への引き継ぎ: per-delegate 枠管理のアルゴリズム(ledger スキャン導出 vs 新規状態)の確定。
