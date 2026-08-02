# Code Generation Plan — u1-schema-resolver

上流入力(consumes 全数): `../functional-design/business-logic-model.md` / `business-rules.md` / `domain-entities.md`、`../nfr-requirements/`(5件)、`../nfr-design/`(5件)、`../../../inception/units-generation/unit-of-work.md`、`../../../inception/requirements-analysis/requirements.md`

## 目的

model-map スキーマへ optional `auxiliaries` / `vocabulary` を追加し(FR-1)、EXTENDS/INSTANCE 推移解決リゾルバ `tla-module-deps.ts` を新設する(FR-2 基盤)。成功3点 (iii)(既存2モデルの identity 値・パース結果不変)を侵害しない。

## 実装計画(実行順)

1. canonical `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` へ `auxiliaries` / `vocabulary` 追加 + exactObject キー集合拡張 + aux/vocabulary 検証(境界・自己 aux 禁止・一意昇順・非空・TLA 識別子)
2. plugin 側 `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` へ byte 複写(`cmp` exit 0 確認)
3. shim `tla-model-map.ts` へ `ModelVocabulary` re-export 追加
4. `tla-module-deps.ts` 新設(純粋モジュール、`readModule` 注入、抽出規則・標準モジュール豁免・推移閉包・循環検出・双方向比較 `ModuleDeclarationDrift`、型付きエラー3種)
5. テスト: スキーマ表(t-formal-verif-model-map-v2)拡張 + 新規 t402(リゾルバ)
6. 検証: 対象テスト green / typecheck / biome / 既存 formal-verif スイート green / `bun scripts/package.ts` 再生成 + `--check` / `promote:self:check`

## AC 対応

- AC1: 負例全件赤(スキーマ表負例 + t402 境界3種)
- AC2: 正例緑 + 省略モデル byte 不変(既存期待値不変)
- AC3: MirrorLifecycle 実ファイルで `["MirrorLifecycleCore"]` 解決 + コメント内偽キーワード不採用 + 境界3種明示失敗
- AC4: cmp 0 + dual-copy 両側 green + typecheck/lint/既存 green

## 結果

実装・検証は `code-summary.md` のとおり完了(commit `17b6fbb1a`)。本書は plan produce の後追い整備(engine カバレッジ判定の必須成果物)。
