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

## Interpretations
- 2026-08-02T23:32:12Z — §12a reviewer 6体中5体が stage frontmatter の生 consumes(条件付き6件)を根拠に「センサー FAILED になる構造」と同一の誤前提 Major を提起 — 実測は engine 解決済み directive の consumes 1件のみで 60/60 PASSED(nfr-requirements は本 scope で SKIP、条件解決済み)。是正は成果物ヘッダへの SKIP 根拠注記1行で、レビュー観点としては「条件付き consumes の解決結果(SKIP 状態)を reviewer ブリーフへ明示していれば5件の同型 Major は起きなかった」— ブリーフ設計面の候補。
- 2026-08-02T23:32:12Z — state-pbt ND の派生値 2.8ms は v(runs 単位)×400(プロパティ実行回数)の単位不整合誤乗算 — 既存 cid:nfr-requirements:derived-value-shows-formula の違反実例(reviewer が算出式照合で捕捉、v×100≈0.70ms へ是正)。
