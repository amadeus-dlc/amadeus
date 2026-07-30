# Requirements Analysis 質問

## 前提

Reverse Engineering の `business-overview.md`、`architecture.md`、`code-structure.md` から、競合原因は per-SHA の不変 JSON と共有 `metrics/index.html`／retention 削除を同じ PR に含めていることだと確認した。以下では、分離後の完了条件と回復範囲だけを確定する。

**回答の統合承認:** 2026-07-30T11:51:51Z
**修正回答の統合承認:** 2026-07-30T13:01:29Z

## 質問

### Q1. Snapshot 公開の成功条件

per-SHA Snapshot Publisher は、どの時点を成功として扱うべきですか？

A. 対象 SHA の JSON が `main` に存在するか、対応 PR のマージ完了を確認した時点。競合・close・タイムアウトは失敗として可視化する（推奨）
B. 対応 PR を作成できた時点
C. `gh pr merge --auto` の登録に成功した時点
D. PR 状態にかかわらず、JSON を生成できた時点
X. Other (please specify)

[Answer]: A — 対象 SHA の JSON が `main` に存在するか、対応 PR のマージ完了を確認した時点。競合・close・タイムアウトは失敗として可視化する。

### Q2. Maintenance の起動と集約

共有 `metrics/index.html` の再生成と retention は、どの経路で実行すべきですか？

A. snapshot の着地を契機に要求を集約し、単一の安定 branch／PR を作成または更新する。並行世代は許可しない（推奨）
B. 定期スケジュールだけで実行する
C. 各 snapshot PR の中で従来どおり実行する
D. 手動実行だけにする
X. Other (please specify)

[Answer]: A — snapshot の着地を契機に要求を集約し、単一の安定 branch／PR を作成または更新する。並行世代は許可しない。

### Q3. 重複・滞留の回復範囲

再実行や既存の競合 PR／リモート branch をどう扱うべきですか？

A. 完全 SHA で冪等化し、既着地 JSON または同一 SHA の OPEN PR を再利用する。自動生成物と確認できる競合・close 済み PR／branch は安全に照合して収束対象とする（推奨）
B. 今後の重複だけ防ぎ、既存の滞留物は扱わない
C. 既存の滞留物だけ一度整理し、再実行の冪等化は行わない
D. 重複や滞留は許容し、手動運用で対処する
X. Other (please specify)

[Answer]: A — 完全 SHA で冪等化し、既着地 JSON または同一 SHA の OPEN PR を再利用する。自動生成物と確認できる競合・close 済み PR／branch は安全に照合して収束対象とする。

### Q4. 競合を回復できた run の終了結果

同一 SHA の自動生成 PR が conflicting／closed だったものの、安全な回復処理によって replacement PR が merged し、maintenance 要求も受理された場合、その run をどう終了すべきですか？

A. 回復後も非0で終了する。自動回復は完遂するが、初期異常を赤く可視化し、最終状態と回復結果を出力する（推奨、Q1を維持）
B. 回復できた場合は0で終了する。「失敗」は未収束時だけを意味するようQ1を改訂する
C. 同じ run では回復せず、非0で終了して後続の手動再実行に委ねる
X. Other (please specify)

[Answer]: A — 回復後も非0で終了する。自動回復は完遂するが、初期異常を赤く可視化し、最終状態と回復結果を出力する。
