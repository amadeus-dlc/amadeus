# Integration Test Instructions

## Scope

orchestrate の directive 発行から state transition までを、両 Unit の成果物記録とともに検証する。

## Commands and expectations

`bun run test:ci` を実行する。既知の CPU 制約による timeout は該当ファイルを単独・延長 timeout で再実行し、実失敗と区別する。

## Contracts

placeholder を含む consumer path が未解決のまま残らず、Abort 後に同じ swarm directive が再提示されないことを確認する。
