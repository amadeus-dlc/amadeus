# Code Generation Plan — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[domain-entities.md](../functional-design/domain-entities.md)（訳語対応表）、[requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent の「コード生成」は lifecycle 6 文書の対訳ペア化である（BR-10）。

## 手順（Bolt 直列）

| # | 手順 | Bolt | 状態 |
|---|---|---|---|
| 1 | overview / scopes / state の英語正 + ja 併置（subagent 3 体並行 + #541 純正性検証） | B001 | 完了（承認 2026-07-06T08:12:07Z） |
| 2 | ideation / inception / construction の英語正 + ja 併置（同体制） | B002 | 完了（gate 承認待ち） |
| 3 | conductor 統一パス（文書間ゆれ 3 種の正規化、新規訳語の対訳記録への登録） | B002 | 完了 |
| 4 | 逆方向リンク 5 箇所の ja→ja 化（FR-2.4） | B002 | 完了 |
| 5 | FR-4.3 機械照合（全ローカルリンク実在、流入参照無破壊） | B002 | 完了（破損 0） |
| 6 | §12a review（architecture-reviewer、最大 2 反復） | stage | 実施中 |
| 7 | validator + test:all の実行と記録 | build-and-test | pending |
| 8 | Codex 初見レビュー 1 回（FR-4.1(c)） | PR 後 | pending |

## 検証方法

全検証記録は [translation-log.md](translation-log.md)（対訳記録 = #541 検証・統一パス・新規訳語・リンク照合の単一記録）を参照。
