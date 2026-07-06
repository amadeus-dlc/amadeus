<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:35:00Z — 記法設計の一次実測源を stage frontmatter の consumes（artifact / required / conditional_on）とし、既存表の 3 列（Artifact / 必須 / 供給元）へ 1:1 対応付けた。phase 共通入力（rules_in_context）は各ステージ表に繰り返さず Phase Overview へ縮退する設計とした（22 ステージ × 4 行の重複を避ける）。
- 2026-07-06T06:35:00Z — units-generation SKIP のため unit 名は u001-lifecycle-inputs とし、Construction 成果物を construction/u001-lifecycle-inputs/ 配下へ置く。amadeus-state.md の Per unit は完了時に実 unit 名へ手動整合する（前例 e10f8294、learnings cid:build-and-test:c2）。
- 2026-07-06T06:35:00Z — §12a 申し送り（requirements-analysis 反復 2）を反映: overview.md / scopes.md の GD009 残存の担当を BR-4 で B001 / B003 に明記した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T06:50:00Z — §12a 反復 1 の指摘 4 件を修正した。(1) HIGH: 供給元ステージが CONDITIONAL の場合の qualifier 付き必須値（必須（Stage N.M 実行時））を B001 規則 3 と BR-9 として追加し、B002 手順に供給元 execution の読み取りを追加（frontmatter は供給元の実行条件をエンコードしないことを実測確認: infrastructure-design の performance-design が required:true、nfr-design が execution:CONDITIONAL）。(2) 供給元語彙へ Space を追加し複数列挙・代替の書式を定義。(3) phase Overview への共通入力段落の新規追記を B002 手順 5 として明示（現状 3 文書とも記述なし）。(4) upstream-coverage は frontmatter の純粋な派生であり独立の実測源としない旨へ記述を補正。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
