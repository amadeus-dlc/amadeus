# Memory: build-and-test

## Interpretations

- B001 の変更は文書、ルール、Amadeus DLC 成果物であり、アプリケーションコードは変更していない。
- このリポジトリの「ビルド」は型検査（`tsc --noEmit`）で代替される。

## Deviations

- 性能テストとセキュリティテストは実行していない。
- 対象変更に性能要求、セキュリティ要求、インフラ設計がないためである。

## Tradeoffs

- `SKILL.md` 本文の英語化を B001 に含めず、方針とルール衝突の解消に絞った。
- これにより #400 の小さい土台 PR が最小差分で代表 skill の英語化に集中できる。

## Open questions

- なし。
