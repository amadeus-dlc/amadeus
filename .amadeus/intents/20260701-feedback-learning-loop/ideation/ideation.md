# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の phase 成果物、traceability、decisions、steering knowledge、validator の責務を整理することで定義できる。 |
| 運用 | feasible | Issue #248 の実行時問題報告を入力にして、現在 Intent 修正と後続 Issue 化の判断へ接続できる。 |
| セキュリティ | feasible | 学習対象は成果物上の判断と検証結果であり、秘密情報や外部学習基盤を扱わない。 |
| 依存 | feasible | Issue #257 の decision review は関連するが、この Intent では feedback 先と学習先の分類を扱う。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | feedback を現在 Intent で直すか、横断 knowledge へ昇格するか、後続 Issue にするかを承認する。 |
| Agent | 実行者 | 後段で見つけた不整合、不足、古い判断を分類し、必要な phase skill へ渡す。 |
| Reviewer | 参照者 | 学習先の分類が現在の PR または Intent の目的を超えていないか確認する。 |
| Validator | 構造検出者 | 必須成果物、リンク、状態、追跡の不整合を検出する。 |
| Evaluator | 品質評価者 | 成果物の内容品質や判断妥当性を評価し、学習候補の材料を出す。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 後段で見つかった事項を、feedback 先と学習先に分類する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 内部 skill 名を `amadeus-learning-review` と `amadeus-feedback-review` のどちらにするかは Inception で判断する。
- `.amadeus/steering/knowledge.md` だけを更新するか、`steering/knowledge/` 配下の専用成果物を併用するかは Inception で判断する。
- Domain Map と Context Map へ昇格するための承認条件は Inception で具体化する。
- Issue #257 の decision review と、この Intent の学習分類をどの順序で起動するかは Inception で整理する。

## 学習候補

- 後段で見つかった前段成果物の不整合は、後段成果物だけで吸収せず、該当する前段成果物へ戻す。
- 何度も現れる scope 判断、Unit や Bolt の分割方針、禁止事項は、Intent 横断で再利用する候補として扱う。
- validator の結果は構造検出を主に扱い、内容の良し悪しは evaluator または人間判断へ渡す。
- PR 作成後に見つかった追跡や最終化の抜けは、現在 Intent 修正、後続 Issue、横断 knowledge のどれに当たるかを分類する。
