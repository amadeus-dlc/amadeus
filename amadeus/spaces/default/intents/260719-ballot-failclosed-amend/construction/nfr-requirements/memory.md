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

- [2026-07-19T23:40Z] Interpretation: 編纂型ステージにつき一次資料(business-rules/requirements/technology-stack)を開いてから起草(compilation-stage-source-first)。conditional consumes の technology-stack.md は T-1〜T-3 で実参照(upstream-coverage-conditional-consumes)。
- [2026-07-19T23:40Z] Interpretation: 性能・セキュリティの専用検査は承認 NFR 不在・新規入力境界なしで N/A(build-and-test:c1/c3、P-1 は regex 構造の直接論証へ — 初稿の E-GMEBT 裁定引用は provenance 欠落で reviewer が捕捉)。

- [2026-07-19T23:50Z] Deviation: reviewer iteration 1 = NOT-READY(Critical: E-GMEBT 裁定引用の provenance 欠落 — 選挙自体は leader store に実在(state=recorded)し公式裁定=不採用(Issue #1261 のユーザー裁定)だが、初稿は開票通知未受領のまま裁定を bare 引用した = 検証可能な出典なしの先取り記入。reviewer の「不存在」判定は自 worktree 限定 grep によるもので存在面は誤りだが、provenance 欠落の指摘は正当 / Major×2: voters ≤6 の発明定数・S-2 の technology-stack 誤帰属)。是正: P-1 を regex 構造の直接論証+出典分離の補足へ、数値を実測値(全34選挙 voters 最大3、型は上限なし model.ts:55)へ、S-2 を domain-entities フィールド直接確認へ。是正 diff の新規引用は独立再実測済み(fix-diff-independent-reverify — model.ts:55 verbatim・record.md 注記 grep 3件)。
