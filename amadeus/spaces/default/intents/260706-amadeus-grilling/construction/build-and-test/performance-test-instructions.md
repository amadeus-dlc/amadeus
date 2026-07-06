# Performance Test Instructions — Amadeus Grilling 統合

## 適用性評価

本変更はプロンプト駆動の対話規律とマークダウン配布のみで、実行時コンポーネント・サービス・データパスを追加しない。性能エンベロープは存在しない(requirements で NFR として不採用 — nfr-requirements/nfr-design ステージはスコープ SKIP)。

## 最小限の確認

- ビルド時間への影響: `bun scripts/package.ts` が従来同様に完走すること(確認済み — 追加は md 2ファイル+manifest 行のコピーのみ)
- テストスイート実行時間への影響: t199 は読み取りのみで <100ms(確認済み)
