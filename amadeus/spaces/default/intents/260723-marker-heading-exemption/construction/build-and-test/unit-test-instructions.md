# Unit Test Instructions — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## 対象と実行

- `bun test tests/unit/t155-template-override.test.ts` — 免除2クラス(x-questions / x-timestamp → pass:true+marker_exempt:true)+非 marker floor 対照(pass:false 維持)+isMarkerArtifact 述語 unit(in-process)
- `bun test tests/unit/t86-sensor-manifest-schema.test.ts` — manifest output_schema の marker_exempt 宣言 assert(E-MHERA2 消費配線)
- `bun test tests/unit/t218-import-meta-main-guard.test.ts` — 免除分岐の in-process 駆動(lcov DA 閉包)
- `bun test tests/unit/gen-coverage-registry.test.ts` — registry 宇宙 497(function:isMarkerArtifact 編入)の freshness

## 合否基準

全テスト 0 fail。落ちる実証は CG で完遂済み(免除実行行の一時無効化→t155 marker 系4テストのみ赤→復元→全緑 — code-summary 参照)。
