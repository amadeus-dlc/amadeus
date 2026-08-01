# Business Rules — U6 docs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U6 の責務は unit-of-work.md U6 行(docs ~200行、全実装 Unit 依存)から、章構成の対象面は requirements.md の FR 系列と components.md の実装目録から、公開 API 面は component-methods.md から、掲載しない面(Relay 改修なし・常駐なし)は services.md から導出した。

## ルール(FR 対応)

- **BR-U6-1**(FR-DOC-1): 章は #1868 の6面+実装実属性の対応表で構成し、実装との1:1を PR で実証(転記元コマンド併記)
- **BR-U6-2**: 件数語は隣接列挙原則。散文の硬数値は count-free 表現へ
- **BR-U6-3**: 実装と docs の乖離発見時は docs 側で吸収せず #1868 改訂を経る(スキーマ統制)

## 実装・検証義務

- doc-consuming テストの読取対象に入る場合は paths-ignore との整合を確認(ci-paths-ignore-doc-guard-blindspot)
- 英日対訳規約: 本章は en。amadeus/**/*.md(record)は日本語のまま
