# Security Test手順

## 上流成果物と攻撃面

`code-generation-plan.md`と`code-summary.md`、Requirements Constraintsを確認した。本変更は認証、認可、secret、network、database、deployment、外部入力API、新規dependencyを追加しない。guard helperはtestからrepository内の信頼済みsource／docs textを受け取るpure functionである。

## 適用する検証

- dependency追加がないことを`package.json`／`bun.lock`差分で確認する。
- extractorが空抽出、marker欠落、重複、片方向差分をfail-closedにすることをunit testで確認する。
- shell integrationは固定scriptへNUL区切りpathをstdinで渡し、command injection用の動的shell組み立てを追加しない。
- lint、typecheck、`git diff --check`を実行する。

## 非適用項目

SAST製品追加、DAST、auth test、injection test、IaC scan、container scanは対象境界が存在しないためN/A。既存必須scanを無効化せず、新しいsecurity waiverも作成しない。

## 合格基準

セキュリティを包括的PASSとは表現せず、攻撃面増加なし・fail-closed分岐green・dependency増加なしを確認した範囲でtest-readyとする。
