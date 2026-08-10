<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-10T08:10:00Z — U1 protocol-core は 0問様式(既決裁定の unit 面展開=執行クラス)で実施。ユーザー承認 2026-08-10T08:07:51Z(全 unit 一括)。security-design は3脅威面(供給元完全性 / マーカー入力面 / 記録内容の秘匿)に限定し、認証・認可・暗号は実行体不在の構造的非適用として明示(cid:nfr-design:c1)。
- 2026-08-10T08:12:00Z — nfr-budget センサーの missing-nfr-ids FAILED は構造的 advisory 赤と判定: 本スコープ(self-feature)は nfr-requirements を SKIP するため id 宣言 dir(construction/<unit>/nfr-requirements/)が不在で unitIdCount=0(amadeus-sensor-nfr-budget.ts idDeclarationDir / unitIdCount 実読)。センサーはスコープの SKIP 解決を知らない。代替証拠: 設計は requirements.md の FR id を verbatim 引用し、独自 id を発明していない(Step 6 の規定どおり「上流が要件を宣言しない場合はその旨を1行で明示」を実施)。ゲートで開示する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
