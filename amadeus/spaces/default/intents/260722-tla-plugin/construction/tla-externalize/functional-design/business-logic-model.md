# Business Logic Model — U1 tla-externalize

上流入力(consumes 全数): unit-of-work(U1 定義・完了条件)、unit-of-work-story-map(体験ステップ2)、requirements(FR-3.1/3.2)、components(C-4/C-5)、component-methods(C-4 TlaModelLoader)、services(実行単位表)

## 中核フロー: モデル外部化と読込

1. **転記**: tla-arm.ts の `MODEL_SOURCE`(:329)/`CFG_SOURCE`(:641)のテンプレートリテラル本文を `specs/tla/FormalElection.tla` / `specs/tla/FormalElection.cfg` へバイト同値で書き出す(エスケープ解決後の実バイト — テンプレートリテラル内の `\\``` 等の逆エスケープに注意)
2. **読込置換**: `loadTlaModelSource(modelPath, cfgPath)` が readFileSync で bytes を取得し、既存の identity 生成(TextEncoder 経由と同一の Uint8Array → canonicalIdentity、tag `amadeus.formal-verif.tla.module.v1` / `.cfg.v1`)へ流す。埋め込み定数は削除(二重保持しない — org Forbidden)
3. **同値固定**: 移行時に「外部ファイル bytes == 旧埋め込み bytes」を identity 同値テストで1回固定し、以後は SOURCE_DRIFT 検証(既存)が外部ファイルの改竄・不整合を検出する
4. **登録簿初期化**: `specs/tla/model-map.json` を作成し、モデルが形式化する実装ファイル(選挙プロトコル: scripts/amadeus-election*.ts の実在ファイル群 — 実装時に glob 実測で確定)の sha256 を記録(U5 sensor の入力)

## エラー経路

- モデル/cfg ファイル不在・空・読取不能 → `ModelLoadError` を Result で返し、呼び出し元(CLI/実験ハーネス)は HARNESS_ERROR 系で loud fail。フォールバック(埋め込み復元等)は持たない
- identity 不一致(prepare 時の SOURCE_DRIFT)→ 既存 toolchainAbort 経路そのまま(本 Unit は検証コードを変更しない)

## 既存資産との結合

- `generateFrozenTlaModel` / `createFrozenTlaModelReceipt`(tla-arm.ts)は bytes 入力化された後も公開シグネチャ不変 — 呼び出し元(run-skeleton-ci.ts = 実験資産・無改変)が壊れないこと(読込元だけが定数→ファイルに変わる)
- invariantMap(:759)は読み込んだ module bytes の文字列化に対して従来同様に適用

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T13:29:56Z
- **Iteration:** 1
- **Scope decision:** none

U1完了条件・FR-3.1/3.2への1:1トレース、機構引用の実コード照合一致、対称性4対、様式適合、フォールバック混入なし。指摘なし。model-map canonical共有はU5 FDレビューへ申し送り。

### Findings

- None
