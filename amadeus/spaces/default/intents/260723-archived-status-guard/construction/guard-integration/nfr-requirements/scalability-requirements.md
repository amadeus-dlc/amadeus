# Scalability Requirements — guard-integration

`business-logic-model` の3入口と `business-rules` の lock/preflight 契約を、`requirements` の FR-05〜FR-07・NFR-01/NFR-04、および `technology-stack` の単一 workspace CLI として評価する。

## Concurrency envelope

- 対象は同一 workspace に対する最大8個の同時 CLI process とする。分散 node、network service、水平 scale は N/A。
- 既存 lock の 50 回 × 100 ms retry、約5秒 timeout を維持する。順序公平性は保証しない。
- 8 process が archived 対象へ `select`、`next`、`unpark` を混在実行しても、全要求が typed rejection となり、永続面への mutation は0件でなければならない。

## Capacity and growth

- guard の作業量は対象 intent の strict status read と既存 preflight に比例し、intent 数に応じた全 registry 再走査を入口ごとに追加しない。
- corpus analyzer は `packages/framework/core/tools/**/*.ts` の対象 TypeScript source 数に線形であり、generated harness tree を別の手書き graph として二重解析しない。
- registry 増大時も diagnostic payload は対象1 intent に限定し、全 intent 一覧を出力しない。

## Contention acceptance

- 8 process fixture を連続20ラウンド実行し、全160 process が約5秒以内に完了または既定 timeout で loud failure となり、fixture 内 starvation を0件とする。
- lock を5秒超保持する blocker fixture では waiter が non-zero で終了し、registry、cursor、state、marker、audit の対象 bytes を変更しない。
- 順序保証や無期限 retry は要求せず、既存 lock policy の変更を本Unitへ持ち込まない。

## Corpus analyzer growth acceptance

- 実 source corpus を1倍 fixture とし、各 source file を異なる仮想pathへ複製した2倍 synthetic corpusを作る。双方を同一process条件で warm-up 3回後に5回測定する。
- 2倍 corpus の中央値実行時間は1倍 corpusの2.5倍以下、peak RSS中央値は2.5倍以下とする。抽出 sink 数も正確に2倍でなければならない。
- 2.5倍を超える結果、sink 数不一致、parse不能、runner provenance 欠落は complexity regression として fail closed にする。
