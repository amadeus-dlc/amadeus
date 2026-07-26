# Tech Stack Decisions — U1 visualize-skeleton

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 技術スタック決定

technology-stack.md(codekb、observed 1c43438df)の可視化前提を確定として引き継ぐ:

- ランタイム: Bun 単独(TypeScript/ESM)。**依存追加ゼロ**(technology-stack.md の可視化技術前提+project.md Forbidden)
- チャート: 自前 inline SVG(チャートライブラリ・CDN 不採用 — ADR-5 既決の適用)
- パーサ・整列・キー解決: scripts/metrics-timeseries.ts の既存 export を import(business-logic-model.md R-1、business-rules.md ルール3 のパーサ単一正本)
- lint/型検査: 既存の Biome+tsc --noEmit が scripts/ を自動包含(新設定なし)
- テスト: bun test 既存ランナー(unit/integration 層 — requirements.md FR-7 の既習様式)

## 新規決定なし

U1 で新しい技術選定は発生しない — 全て inception 既決(ADR-1〜5)と codekb 実測前提の適用。
