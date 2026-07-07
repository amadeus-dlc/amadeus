<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-06T20:17:39Z — 比較軸を「配布モデル」で切った(機能比較ではなく); インストーラのインテントに直結する導入・更新・保護の3軸が競合差を最も鮮明にするため

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-07-06T20:17:39Z — differentiation strategy brief を独立ファイルにせず competitive-analysis.md 内の差別化機会セクションに統合; ステージfrontmatterのproducesは3成果物+質問票でありファイル数を増やさない方を優先

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-07-06T20:17:39Z — 市場規模の定量化(Q候補だった addressable audience)は質問から除外; OSSツールで計測基盤がなく ideation ガードレールの証拠基準を満たせないため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T20:17:39Z — 競合(cc-sdd/spec-kit)の非破壊マージ・カスタマイズ保護の詳細実装は未検証(確信度:中の仮説として記載)— 要件分析前に必要なら深掘り
