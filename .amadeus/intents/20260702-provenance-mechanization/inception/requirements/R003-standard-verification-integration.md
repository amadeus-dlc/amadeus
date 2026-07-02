# R003 標準検証への組み込み

## 要求

照合が `npm run test:all` の chain に含まれ、drift があると標準検証が fail する。

## 背景

`provenance:check` が単体で実行できるだけでは、CI で自動的に drift を検出できない。既存の `npm run test:all`（`test:it:all` 経由で個別 eval を束ねる構造）に組み込むことで、既存の標準検証運用を変えずに検出を常時化する。

## 受け入れ条件

- `provenance:check` の実行が `npm run test:all` の chain（`test:it:all` など既存の束ね方）に含まれる。
- `provenance/` を持つ Intent に drift がある場合、`npm run test:all` が fail する。
- `provenance/` を持つ Intent が存在しない場合、`provenance:check` は失敗しない。

## 依存

- R002

## 対応する対象境界

- SC-IN-003

## 未確認事項

- なし。
