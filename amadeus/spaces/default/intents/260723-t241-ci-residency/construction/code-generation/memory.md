<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T03:07:39Z — reviewer M1(FR-2b 参照不一致)の conductor 実測: EXPECTED_NONE_TO_CLI の実体は tests/unit/gen-coverage-registry.test.ts:855(:857 が新 integration パスへ更新済み)— requirements.md:15 の『tests/gen-coverage-registry.ts』は起草時の引用誤り(cid:mechanism-cite-verify-at-draft の違反実例、PM 回付)。実装は実体を正しく編集しており裁定・要件意図からの逸脱なし(承認済み requirements は編集せず本 diary で正誤を固定)
- 2026-07-23T03:07:39Z — m1 実測: t257 の :28 `MARKER = \`CI-\${"resident"}\`` は runtime 合成、doc コメントは literal — 2箇所は別機構で自己一致ノイズ回避は実在。m2 は cid 例示数値で閾値要求でないことを確認
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T03:07:39Z — reviewer READY(GoA 2)の条件(conductor 実測4件)を全て実施: #1 EXPECTED_NONE_TO_CLI 所在確定 / #2 t257 マーカー機構実在 / #3 t237 復元 diff 0行 / #4 Layer ヘッダ慣習一致(t236 同型)。fixture 汚染シャード(#1389)3回目の再現を除去し Issue へ追記済み
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
