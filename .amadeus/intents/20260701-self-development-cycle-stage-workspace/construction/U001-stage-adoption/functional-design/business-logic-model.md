# Business Logic Model

## 目的

stage 判定語彙と stage0 採用判断を、後続 Intent が参照できる実装対象として固定する。

## 対象 Unit

U001 stage 採用。

## 業務ロジック

- stage0 は、作業開始時点で build workspace から利用可能な昇格済み skill、validator、開発用スクリプトを表す。
- stage1 は、target workspace にある作業中の source skill、`.amadeus/` 成果物、ローカル検証結果を表す。
- stage2 は、PR によって target artifacts と検証結果がそろった状態を表す。
- stage2 は、対象 PR の merge、基準 commit の更新、人間による採用承認がそろった場合だけ、次回作業の stage0 として扱う。
- stage0 採用判断は自動判定にせず、Maintainer の判断として追跡する。

## 入力

- 対象 PR の merge 状態。
- merge 後の基準 commit。
- build workspace が参照する commit。
- validator と標準検証の結果。
- Maintainer の stage0 採用判断。

## 出力

- stage0、stage1、stage2 の定義。
- stage2 を次回 stage0 として扱う条件。
- stage0 採用判断の記録先。

## 未確認事項

- stage 語彙を `CONTEXT.md` に昇格する必要が出るかは後続 Intent で判断する。
