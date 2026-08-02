<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-02T11:05:00Z — degrade スコープの per-unit 解決: engine の fail-closed エラー指示に従い unit dir(construction/vocab-canonicalization/)を遅延作成し、解決済み directive を scratch へ捕捉(cid:c1-degrade-batch-directive-capture)。単一 unit のため gate:true のまま body+reviewer+gate を1パスで実施
- 2026-08-02T11:05:00Z — frontend-components.md は CONDITIONAL(UI 非該当)につき非生成、不在を機械確認(E-GSFFD13)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-02T11:20:00Z — §12a iteration 1 NOT-READY(Major2: BR-2条件5の検査面未配線 / ADR-1 候補(iii)比較欠落、Minor2: 出典なし主張・ADR影響記載非対称)→ 全件是正して iteration 2 へ。「guard を宣言したら検査面(フロー+テスト)まで同時に配線する」対称性の実例
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-02T11:05:00Z — OQ-1 のマーカー様式は requirements 候補(ii) HTML 行内コメントを退け fenced YAML マニフェスト(ADR-1)を採用 — 行内コメントはセル境界が処理系依存で無音に壊れるため。棄却理由を ADR に明記(citation-semantics-check 対応)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
