# 後段 feedback と Intent 横断の学習ループ

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus DLC の lifecycle contract と phase 成果物の扱いを標準化する技術目標である。 |
| scope | refactor | 既存の phase と成果物を前提に、後段 feedback と Intent 横断学習の契約を整理する Intent である。 |
| labels | feedback, learning, traceability, self-development, governance | 後段 feedback、Intent 横断学習、追跡、自己開発、運用統制を表す。 |

## 目的

Amadeus DLC に、後段 feedback と Intent 横断の学習ループを定義する。

この Intent は [Issue #259](https://github.com/amadeus-dlc/amadeus/issues/259) を根拠にする。

後段 phase で前段成果物の不整合、不足、古い判断が見つかった場合に、どこへ戻すかを明確にする。
また、完了済み Intent から次の Intent へ引き継ぐ知識を、Steering knowledge、Domain Map、Context Map、後続 Issue、後続 Intent、または不採用に分類できるようにする。

## 成功条件

- 後段 phase が前段成果物へ feedback すべき条件が定義されている。
- 前段成果物へ戻す場合に使う phase skill または内部 stage skill の判断軸が説明されている。
- Intent 横断の学習先を Steering knowledge、Domain Map、Context Map、後続 Issue、後続 Intent、または不採用に分類できる。
- `学習候補`、`traceability.md`、`decisions.md`、`.amadeus/steering/knowledge.md` の責務が重複しない。
- validator または evaluator の結果を、構造検出、品質評価、学習候補に分類できる。
- Issue #257 の decision review と接続しつつ、同一責務に混ぜない。

## 範囲

含めるもの:

- 後段 phase が前段成果物の不整合、不足、古い判断を見つけた場合の戻し先。
- 現在 Intent で直す対象と、後続 Issue または後続 Intent に切る対象の分類。
- 完了済み Intent から次 Intent へ再利用する知識の抽出手順。
- `.amadeus/steering/knowledge.md`、Domain Map、Context Map へ昇格する条件。
- validator または evaluator の結果を学習候補として扱う条件。
- Issue #257 の decision review との接続境界。

含めないもの:

- モデル自体の重み更新。
- 外部の学習基盤やデータベース導入。
- Operation phase の全面設計。
- 完了済み Intent 成果物の一括移行。
- validator を意味検証エンジンへ拡張すること。
- Inception の前に要求、ユースケース、Unit、Bolt、Task、実装を作ること。

## 現在の phase

Ideation を開始する。

Inception では、feedback 条件、学習分類、対象成果物、skill 連携、検証方針を要求として具体化する。
