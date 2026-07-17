# Intent Backlog — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): scope-document.md、`../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`(C-1〜C-6 の制約枠)。

## バックログ(優先順)

| # | アイテム | In Scope 対応 | 規模見立て |
| --- | --- | --- | --- |
| B-1 | 閉じ列挙 4→6(5ファイル)+ install 正常系完走 | In 1, 3 | S |
| B-2 | 列挙全数性テスト(dist ⇔ installer の機械検出) | In 2 | S |
| B-3 | npm pack 実検証+将来条件チェックリストの再固定 | In 4 | S |
| B-4 | README install コマンド2行 | In 5 | XS |

単一 Bolt(S 規模)に収まる見込み — 分割判断は units-generation で最終確定(B-1〜B-4 は同一ファイル群+同一検証列のため直列合成が自然)。

## 除外・先送り

Out of Scope 5点(scope-document 参照)。付随4ファイルの扱いは requirements の pre-declared 分岐へ。
