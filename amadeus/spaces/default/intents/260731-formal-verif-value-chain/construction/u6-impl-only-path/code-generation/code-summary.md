# Code Summary — u6-impl-only-path

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(bolt-u6-impl-only-path ブランチ、conductor へ --no-ff マージ済み `02e94bc26`)

- `updateModelMap --impl-only` 正規経路(コミット `0950d6099`)— P1 の3分岐(受理/意味論変化拒否/no-op 拒否)、IMPL_ONLY_UPDATED 構造化結果(実 publish 由来)、成功 union 第3メンバー、無フラグ経路バイト不変、MODEL_UNCHANGED/SOURCE_DRIFT/manifest 文書への正規手順追記。
- テスト: `tests/integration/t380-impl-only-model-map-update.integration.test.ts` — conductor 引き取り再実測 **17 pass / 0 fail**(既存 t380-locked-canonical-emit 同居分含む)。
- 共通ゲート全 exit 0。swarm check converged ✓。統合検証: 再接地後フルスイート **RESULT: PASS(fail 0)**。
- 補足: builder は検証ループ滞留のため c5/disk-evidence 引き取り。#1510 の詰み(MODEL_UNCHANGED×SOURCE_DRIFT)はこの経路で解消 — u7 のモデル登録後に u8 e2e で一連貫通を実測する。
