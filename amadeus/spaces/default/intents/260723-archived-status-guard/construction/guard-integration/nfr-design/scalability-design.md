# Scalability Design — guard-integration

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`をlocal workspaceの容量・並行性へ割り当てる。

## Concurrent CLI design

- 同一workspace最大8 processを既存lockの50回×100 ms retryで直列化する。
- 8 processがarchived対象へselect/next/unparkを混在実行し、全8件typed rejection、永続mutation 0件、fixture starvation 0を要求する。
- 5秒超blockerではwaiterをnon-zero timeoutとし、registry、cursor、state、marker、auditを変更しない。公平な取得順序は保証しない。

## Corpus growth design

- `packages/framework/core/tools/**/*.ts`を1倍corpusとし、異なる仮想pathへ複製した2倍corpusを生成する。
- warm-up 3回後に各5回測り、2倍corpusのmedian時間・peak RSSを1倍の2.5倍以下、抽出sink数を正確に2倍とする。
- analyzerはsourceを一度parseしてsymbol indexを構築し、sinkからreverse edgesを辿る。sinkごとの全source再parseを禁止する。

## Non-applicable scaling

- distributed lock、horizontal service、load balancer、shard、autoscaling、AWS infrastructureはN/A。
- registry件数超過の新hard capや全intent diagnostic出力を追加しない。
