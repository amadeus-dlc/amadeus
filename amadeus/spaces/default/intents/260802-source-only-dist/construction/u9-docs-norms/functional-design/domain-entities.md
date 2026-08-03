# Domain Entities — u9-docs-norms

上流入力(consumes 全数): component-methods(C9)、requirements(FR-6)、components(C9)、unit-of-work(u9)、unit-of-work-story-map(Slice 4)、services(文書化対象の境界)。

## 対象エンティティ(文書 — 新型なし)

本 Unit は文書・規範の更新であり、コード型を導入しない。

| エンティティ | 正本 | 備考 |
|---|---|---|
| README / README.ja | リポジトリルート | 日英同期(BR-U9-2) |
| CONTRIBUTING.md | 同上 | :17/:48 の契約文 |
| AGENTS.md 手書き部 | 同上(u5 の import 分離後の形) | :90 の規約文言 |
| docs/ 配下ガイド群 | 語彙 grep で導出(BR-U9-1) | 対象一覧は実装時 grep 出力から転記(inventory-from-grep-each-time) |
| ノルム PR 文案(project.md 改訂4点) | 本 record 配下に起草 → norm PR へ(PR 作成は conductor 執行) | project.md の該当 Forbidden/Mandated 4条項。衝突第5項(CLAUDE.md 等)は文書更新側で実施 |

## 不変条件

1. 文書の記述する配布モデル・検証集合が u8 着地後の実装と一致(乖離ゼロ — BR-U9-6 の grep で機械確認)
2. ノルム PR 文案は G 裁定・ADR を引用し、新規判断を含まない(裁定転記の正確性 — 転記照合の対象)
