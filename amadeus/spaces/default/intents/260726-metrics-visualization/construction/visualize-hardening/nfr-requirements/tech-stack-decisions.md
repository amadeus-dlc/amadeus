# Tech Stack Decisions — U2 visualize-hardening

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 技術スタック決定

U1 の決定(依存ゼロ・inline SVG・timeseries seam・既存 lint/test)を全面継承(technology-stack.md の可視化前提)。U2 固有:

- CI: 既存 metrics-snapshot job への1ステップ追加のみ(business-logic-model.md 増分4、business-rules.md ルール16 の位置固定)— 新 workflow・新 action を導入しない(ci-pipeline:c2)
- docs: 既存 docs/ 構造(日英ペア)に従う(requirements.md FR-8)。静的サイトジェネレータ等は導入しない

## 新規決定なし

技術選定の新規判断は発生しない — サイズガード定数の導出(ADR-3)も inception 既決の適用。
