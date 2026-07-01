# Business Logic Model

## 目的

完了済み Construction の traceability 条件を、Construction 公開入口と traceability finalization の手順から判断できるようにする。

## 対象 Unit

U001 finalization skill guidance。

## 業務ロジック

Construction の追跡は、Task 生成の追跡と完了時の証拠追跡を分けて扱う。

`Task Generation からの追跡` は、Task Generation から Task までの対応を示す。
完了済み Construction では、実装と検証の証拠まで追跡するために `Construction からの追跡` を追加する。

`Construction からの追跡` は、`ボルト`、`タスク`、`証拠`、`状態` の列を持つ。
この列は validator の既存契約に合わせる。

## 入力

- Issue #245。
- PR #244 の完了済み Construction traceability 例。
- `dev-scripts/evals/amadeus-validator/check.ts` の既存契約。
- `amadeus-construction` と `amadeus-construction-traceability-finalization` の skill 本文。

## 出力

- Construction 公開入口の検証説明。
- Traceability finalization 内部 skill の手順。

## 未確認事項

なし。
