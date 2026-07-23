# Scalability Requirements — lifecycle-transaction

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`が示すlocal workspace transactionを対象とする。

## Capacity

10,000 audit rows・10,000 registry entriesまで性能予算を保証する。audit/registry scanはO(n)、journalはspaceあたり最大1件・O(1) size。複数shardは総row数に対してO(n)で処理する。

local concurrency envelopeは同一workspaceで同時起動8 process。既存lockの50回×100ms retry（最大約5秒）内に8 processが直列化され、全件成功・event重複0を要求する。lockを5秒超保持するfixtureではwaiterがnon-zero timeoutとなり、journal/audit/registry/cursorを変更しない。取得順のfairnessは保証しないが、8-process fixtureでstarvation 0を要求する。

## Non-applicable modes

horizontal scaling、multi-region、distributed lock、autoscalingはN/A。workspace lock下の単一writer CLIであり、分散serviceではない。
