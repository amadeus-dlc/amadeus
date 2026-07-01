# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の amadeus-* skill、Intent 成果物、GitHub Issue 運用を組み合わせて段階的に定義できる。 |
| 運用 | feasible | 自己開発 cycle で見つかった改善要望を後続 Issue に切り出す運用と整合する。 |
| セキュリティ | feasible | 報告内容に秘密情報を含めない制約を Acceptance にできる。 |
| 依存 | feasible | Issue #248 と先行 Intent の成果物を根拠に Inception へ進められる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | 報告先、報告対象、後続 Issue 化の境界を決める。 |
| Agent | 実行者 | skill 実行中に見つかった問題や懸念を、定義済みの形式で報告する。 |
| Reviewer | 参照者 | 報告内容が現在の Intent の範囲に混ざっていないか確認する。 |
| Validator または Evaluator | 検証対象 | 構造条件と内容評価の境界を分けて扱う。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | skill 実行中に懸念が見つかった場合に、現在の Intent へ含めるか後続 Issue にするかを確認する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 報告先を GitHub Issue、Intent の notes、traceability、decisions、別の報告成果物のどれにするかは Inception で確定する。
- 内部 skill と共通契約のどちらを採用するかは Inception で比較する。
- validator または evaluator 後段へどこまで渡すかは Inception で整理する。
- 代表的な skill の対象範囲は Codebase Analysis で確認する。

## 学習候補

- Issue #248 の検討案を比較し、内部 skill と共通契約の責務差を整理する。
- 既存の amadeus-* skill が実行上の問題をどのように扱っているかを確認する。
- GitHub Issue 化と Intent 成果物記録の境界を、自己開発 cycle の既存成果物から確認する。
