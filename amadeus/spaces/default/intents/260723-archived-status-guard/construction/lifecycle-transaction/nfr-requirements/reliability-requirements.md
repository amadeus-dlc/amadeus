# Reliability Requirements — lifecycle-transaction

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`に基づくforward recovery契約。

## Recovery targets

- 7 failure境界それぞれ100回の障害注入で100%期待状態へ収束する。
- operationId + event typeごとの成功auditは正確に1件。
- recoveryは予約HUMAN_TURN、operationId、userInputを変更しない。
- readerはrecovery完了後の状態だけを返し、中間不整合を公開しない。
- journal削除失敗を含め、次回preflightで同じ最終bytesへ収束する。

## Failure policy

validation/journal write前はaudit・registry・cursor不変。durable step後はrollbackせずforward recoveryする。corruptionはavailabilityよりintegrityを優先してworkspace操作を停止する。常駐service SLA、backup service、pagingはN/A。

## Observability

常駐monitoring、alerting、distributed tracingはN/A。代替するlocal CLI observabilityとしてfatal errorはerror kind、journal path、operationId（decode可能時）、intentDir、期待step/status、観測値、手動調査が必要なことをstderrへ出す。secretやaudit全内容を外部送信せず、既存audit shardを永続証跡とする。
