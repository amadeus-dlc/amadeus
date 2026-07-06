# Domain Entities：#395 方針確定

## 目的

#395 方針確定に必要な Domain Entity と、後続 Unit との関係を定義する。

## Domain Entity

| Entity | 責務 | 主な属性 |
|---|---|---|
| 英語化方針 | `SKILL.md` を英語化するか、現状維持するかの判断を表す。 | 判断、理由、対象 Issue、完了証拠 |
| 言語対象 | 英語化する対象と日本語維持対象を分ける。 | パス集合、扱い、根拠 |
| 生成成果物契約 | Amadeus DLC が生成する日本語 Markdown の維持条件を表す。 | 対象パス、維持理由、検証方法 |
| 昇格フロー | source skill から昇格先 skill へ反映する手順を表す。 | source skill、昇格先 skill、実行コマンド、検証 |
| PR 境界 | 英語化 PR で説明すべき変更範囲と検証結果を表す。 | 対象 Issue、対象 Intent、変更範囲、検証結果 |
| 完了証拠 | 子 Issue の完了を示す外部証拠を表す。 | PR URL、merge 状態、Issue close 状態 |

## 関係

英語化方針は、言語対象と生成成果物契約を参照して判断される。

言語対象が source skill と昇格先 skill を含む場合、昇格フローを通じて同期する。

PR 境界は、英語化方針、言語対象、昇格フロー、検証結果を説明対象にする。

完了証拠は、#395 対応 PR の merge または明示的な Issue close から得られる。

## Domain Map と Context Map への反映候補

| 候補 | 種別 | 判断 |
|---|---|---|
| なし | 共有境界 | 見送り |

## 未確認事項

- 共有境界として Domain Map に採用する新しい Bounded Context はない。
- Context Map に採用する新しいコンテキスト間依存はない。
