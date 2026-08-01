# Integration Test Instructions — formal-verif-value-chain

上流入力(consumes 全数): requirements, code-generation(各 unit の code-summary), unit-of-work

integration 層(実 FS — fs-tests-integration-first)— 本 intent の新設分:

- `t377-plugin-boundary-guard.integration.test.ts`(u3): 4面(plugins/ + dist/plugins/ 8 変種 + .claude/plugins/ + staging)の `scripts/` 参照 0 件 sweep+fixture 注入の落ちる実証恒久化+許容リスト空維持 assert+vacuity guard。
- `t378-advisories-directive-field.integration.test.ts`(u5): directive JSON `advisories` の出現/非出現・per-field validator。
- `t381-advisory-checkpoints-latch.integration.test.ts`(u5): 発火点3点・emitSingleRunStage(--single)経路・run ラッチ。
- `t382-activation-real-layout-spec-root.integration.test.ts`(u8 glue): **実デプロイレイアウト**(root/.claude=host、root/specs/tla=spec)での spec-root/host-root 2ルート分離を pin。
- `t379-plugin-tools-distribution.integration.test.ts`(u4): compose 後の tools 実在+digest 記録・drop 対称・一括 compose の fail-closed 集計・配布先自立実行。
- `t380-impl-only-model-map-update.integration.test.ts`(u6): --impl-only の受理/拒否 3 分岐・無フラグ後方互換・MODEL_UNCHANGED 案内。
- `t-formal-verif-mirror-model-registration.integration.test.ts`(u7): MirrorLifecycle 4 ファイル SHA ピン+drift 検出(落ちる実証は conductor が統合断面で注入→赤→revert を再実測 — u8 S3 補遺)。
- 既存 fixture 改修(u8 glue): t320/t321/t322/t378/t381 を実レイアウトへ(TEST CONTRACT REVISION 宣言付き)。

e2e 相当は u8 の実測記録(`construction/u8-e2e-acceptance/code-generation/e2e-evidence.md`)— advisory 貫通(CP1/CP2×never-run/changed/current)・TLC verdict 到達・audit イベントは本ステージ後の formal-model-check ステージ実行で閉包(S1-f)。
