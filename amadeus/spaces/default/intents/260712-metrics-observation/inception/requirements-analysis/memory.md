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

- 2026-07-12T05:50:00Z — Interpretation: 委譲6点のうち5点を証拠で確定(E-DC-Q0 前例の「選挙でなく実測証拠で閉じる」型): 保存形式=個別 JSON(shared-ledger-insert-collision 実測クラス回避)、トリガー=merge workflow+手動(release.yml 前例)、lcov 含める(seam 既存)、スキーマ疎結合+tool_version、配置=dist 非コピー面(正確な dir は design)。真に未決は Q1(テスト数 seam 方式)のみ。
- 2026-07-12T05:50:00Z — Tradeoff: Q1 は (A) 既習様式の対称拡張 vs (B) 無改修だが文言結合 vs (C) スコープ縮小 — 実測では決まらない設計判断のため blind 選挙へ(起草者推奨は開票後公開の運用どおり伏せる)。

- 2026-07-12T05:58:00Z — Interpretation: 委譲6点中5点を証拠で確定・1点(Q1)のみ選挙(E-MO-RA 6/6 = A)— E-DC-Q0 前例の適用。product-lead レビュー READY(出典11件の独立再確認・捏造ゼロ・E-L62/E-L76 準拠確認)。
- 2026-07-12T05:58:00Z — Open question: 非ブロッキング所見2点を後続へ申し送り — (1) CI 時間の定量合否基準は nfr-requirements/nfr-design で定量化 (2) rough-mockups の JSON 例に test_pyramid collector を design 段で追補(モックは例示ラベル明記済みで正本は FR-1)。
