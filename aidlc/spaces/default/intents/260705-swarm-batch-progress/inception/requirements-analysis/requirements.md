# Requirements — invoke-swarm のバッチ進行（260705-swarm-batch-progress）

対象 Issue: [#486](https://github.com/amadeus-dlc/amadeus/issues/486)

## 意図分析

`tryEmitSwarm` は runtime-graph の `bolt_dag.batches`（静的トポロジ）の第 1 レベルを常に提示し、完了済み batch を除外しない。
#470 の Construction では BOLT_COMPLETED 記録後も同じ batch が提示され続け、conductor がバッチ進行を自前で追う必要があった。

## 機能要求

- R001: `tryEmitSwarm` は batch の unit を coverage ledger（当該ステージの produces の実在 = 既存 `unitCovered`。questions Q1 = A）で判定し、**未完了 unit を含む最初の batch の未完了 unit だけ**を `invoke-swarm` で提示する。
- R002: 全 batch の全 unit が covered の場合、swarm を発火せず（false を返し）、per-unit ループの all-covered 再入（`emitPerUnitRunStage` の gate 付き run-stage）へ落とす。
- R003: batch 内の一部 unit だけが covered の場合、その batch の未完了 unit のみを提示する（covered な unit を重複提示しない）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI（intent-birth → jump → runtime compile → orchestrate next）を駆動する。RED 先行（修正前は batch 1 を再提示し続けることを確認する）。fixture の Bolt DAG は **2 unit 以上を含む batch を最低 1 つ**含み、うち 1 unit だけ covered にした状態で `units` 配列が未完了 unit だけになることを検証する（AC3 の直接検証。reviewer 指摘対応）。
- N2: 既存検証の退行なし（`npm run test:all` 全件）。
- N3: parity-map の engineFileExceptions へ `tools/aidlc-orchestrate.ts` を宣言する。

## 受け入れ条件

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | batch 1 完了後の `next` が batch 2 の units を invoke-swarm で提示する | R001 |
| 2 | 全 batch 完了後の `next` は invoke-swarm を発火せず gate 付き run-stage へ落ちる | R002 |
| 3 | 部分完了 batch では未完了 unit のみ提示される | R003 |
| 4 | 既存検証に退行がない | N2 |

## スコープ外

swarm prepare / finalize 側の変更、bolt_dag の compile 方式変更、#432（--doctor、後続割り当て）。
