<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-15T18:14:49Z — [U1] diary の配置は engine の run-stage directive が memory_path=construction/functional-design/memory.md(ステージ直下)を宣言するためそれに従う — reviewer Minor #3 の per-unit 配置指摘は規約と engine 解決の differ であり、engine 宣言を正とし per-unit エントリは [U1] プレフィクスで本ファイルに集約する
- 2026-07-15T18:14:49Z — [U1] 質問ファイル不作成: 設計判断(新規ドメイン型不導入・frontend-components CONDITIONAL skip)は既決(ddd-when-to-wrap-primitives / ui-less-mockups)と承認済み上流からの導出で未決なし
- 2026-07-15T18:14:49Z — [U1] reviewer iteration 1 REVISE(Major 1: EmitResult.files→written の誤記 — 上流 component-methods.md 由来の同根)→ U1 設計2ファイル+上流1ファイルを同時是正(E-CS8 裁定先例: 誤引用の遡及是正は要件実体を変えず逸脱非該当)。Minor 2(引用行精密化 :176-186 / diary 配置)も対応
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-15T22:30:56Z — [U1] builder が実装前停止で harness.json の二重所有(emit 設計 vs writeHarnessData 既存機構)を検出 → E-OC15 裁定 A(emit 1エントリ・writeHarnessData 委譲)。**原因所在 = 設計(下位 functional-design 層の誤転記 — 上流 C3『既存機構の再利用』を harness.json の emit エントリ化と誤って具体化)**。訂正3ファイル(business-logic-model/domain-entities/business-rules)の新規引用(package.ts:219-224 / amadeus-lib.ts:175-189)は fix-diff-independent-reverify で書いた直後に再実測済み
- 2026-07-15T18:30:57Z — [U3] reviewer READY(GoA 2、条件: exit 意味論の実測工程明文化)→ R-U3-1/R-U3-6 と upstream C2 記述(codex=exit 0 / cursor=2以外の非ゼロ — 値相違・意図同一)を是正。[U2] READY(GoA 3、Major: AC-2a が完了条件欠落)→ 追記+出典訂正。[U4] READY(GoA 2、Minor 2)→ smoke 期待表の保守規約追記+R-U4-5 を integration-registry-regen の具体対象へ精密化。4 unit 全て READY 到達
- 2026-07-15T18:17:26Z — [U1] iteration 2 = 条件付き READY(GoA 3、残1件: deriveHarnessDir への誤帰属)→ shippedRulesSubdir(:175-189)へ即時修正し conductor が実コード直読(sed :175-189 で readFileSync(harness.json) を確認)で閉包 — 引用是正が新たな誤帰属を固定する二次欠陥は mechanism-cite 系の既知パターン(件数再計算ミスと同型の是正時再検証の必要)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
