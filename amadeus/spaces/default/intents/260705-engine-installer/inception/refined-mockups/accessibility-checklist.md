# Accessibility Checklist — Engine Installer（260705-engine-installer）

上流入力: [interaction-spec.md](interaction-spec.md)

## 適用判断

GUI アクセシビリティ基準（WCAG 等）は CLI のため不適用とする。

## CLI 代替基準

- [x] 色・装飾に依存せず、テキストだけで全情報が伝わる（interaction-spec の出力規約）。
- [x] 進行・結果が逐次テキストで出力され、スクリーンリーダー・CI ログで欠落なく追える。
- [x] エラーは原因と対処を常に伴い、終了コードで機械判別できる。
- [x] 非対話（入力待ちで固まらない）。
