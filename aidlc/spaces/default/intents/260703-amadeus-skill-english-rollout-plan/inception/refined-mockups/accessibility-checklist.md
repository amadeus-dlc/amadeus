# Accessibility Checklist：Amadeus skill 英語化実施計画

## 概要

この成果物は、Markdown と Mermaid で表現する相互作用図の読み取りやすさを確認する。

UI アクセシビリティ基準の適用対象はない。

## チェックリスト

| ID | 確認項目 | 状態 | 根拠 |
|---|---|---|---|
| A001 | Mermaid node のラベルだけで意味が分かる。 | satisfied | Issue 番号と役割を併記している。 |
| A002 | 色だけに依存して状態を表していない。 | satisfied | 状態は node label と edge label で表している。 |
| A003 | 要求 ID とストーリー ID から相互作用を追跡できる。 | satisfied | mockups.md と interaction-spec.md に参照を置いている。 |
| A004 | UI 操作に依存した説明をしていない。 | satisfied | この Intent は UI を対象にしないため、相互作用図として記録している。 |

## 未適用

キーボード操作、フォーカス制御、色コントラスト、スクリーンリーダー対応は未適用である。

この stage では実装対象の UI を定義しないためである。
