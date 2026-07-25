# Scalability Requirements — mirror-state-provenance

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity Model

Stateはactive Intent単位の単一local aggregateであり、分散databaseやhorizontal scalingは非適用である。

| Dimension | Supported bound | Behavior |
|---|---:|---|
| state document | 2 MiB | 超過はwrite前`invalid` |
| receipts | 1,000 | event key map lookup、上限超過拒否 |
| warnings | 1,000（通常999＋capacity予約1） | 同operation／classification／effectをcoalesce。通常枯渇時はremote開始を抑止 |
| repair challenges | active最大100 | consumedはrepair commit時、expiredは次回発行前に即時removeしproofをauditへ移す |
| concurrent writers | 32 callers fixture | lock＋revision CASでwritten 1件、残りconflict |

## Scaling Rules

- Intent数が増えてもactive／explicit Intentのstateだけを読む。
- aggregate sizeに対しparse／validationはO(N)、receipt lookupはkey mapでO(1) averageとする。
- concurrent writerをqueue、database、daemonで調停せず既存lockとCASを再利用する。
- active receipt／warning／challengeをcapacity都合で削除しない。coalesce／pruneした履歴はtransaction auditへ残す。
- marker候補数をState Storeで丸めず、0／1／複数の分類を保持する。

## Degradation

capacity、lock、I/O、CAS failureはtyped outcomeとして上位へ返し、partial stateやfallback provenanceを生成しない。workflow非阻害の表示・継続判断はLifecycle ownerへ委譲する。

## Acceptance

1. 各上限値ちょうどは受理し、上限＋1は元file不変で拒否する。
2. 32 caller同revision fixtureでlost update 0、written exactly 1となる。
3. non-default Space／明示Intentでも別recordをread／writeしない。
