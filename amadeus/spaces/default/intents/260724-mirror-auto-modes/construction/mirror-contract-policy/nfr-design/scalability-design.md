# Scalability Design — mirror-contract-policy

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Capacity Architecture

本Unitは単一process内のbounded transformであり、horizontal scaling、sharding、load balancer、distributed cacheは非適用である。capacityは入力集合のclosed contractで制御する。

| Dimension | Design envelope | Algorithm |
|---|---:|---|
| config layers | 3 | fixed ordered scan |
| modes | 3 | discriminated union lookup |
| boundary kinds | 5（`intent-capture | phase | park | workflow-completion | manual`） | exhaustive switch |
| invocation sources | 2（`lifecycle | manual`） | manualだけmode解決を要求しない |
| mirror operations | 3（`create | sync | close`） | exhaustive switch |
| completion chain | create→sync→close | current-instance index lookup |
| config bytes | 1 MiB／file | bounded read＋single parse |
| decision batch | 1000／process | stateless repeated call |

## Growth Strategy

`MirrorConfigLayerInput`、`MirrorMode`、`MirrorBoundaryKind`、`MirrorInvocationSource`、`MirrorOperation`をC0 leaf typesで一元管理する。manualは`boundary.kind="manual"`かつ`source="manual"`で表し、operation自体は`create | sync | close`の3種から選ぶ。C1 parser、C2 policy、event encoder、contract fixtureは同じunionをimportし、別のstring listを持たない。

新しいmode、layer、boundary、operationを追加する変更は次をatomicなreview unitとする。

1. C0 unionとschema。
2. C1 precedence／parse table。
3. C2 applicability／decision／completion table。
4. event identity version判断とgolden vectors。
5. runtime contract、skill、Guide／Reference、全surface projection。

既存event key tupleの意味を変える場合はv1を黙って再利用せずversionを上げる。単なる表示detail追加はidentityに含めない。

## Concurrency and Isolation

C2はglobal mutable stateを持たず、100並行callで共有するのはimmutable function codeだけである。config snapshotとMirror snapshotはcallごとに渡し、module singleton cacheへ保存しない。C1もselector結果をcall外へ保持しないため、複数Space／Intentの同時評価が相互汚染しない。

completion chainは安全順序を保つため直列とし、throughput目的でcreate／sync／closeをparallel化しない。remote throughputやrate limitはGateway Unitが所有する。

## Capacity Failure

- file size、layer数、unknown variantがenvelopeを超えたらfail closedし、subsetだけを評価しない。
- oversize時もraw bytesをdiagnosticへ載せず、layer／path／limitだけを返す。
- expansionを理由にmapのdefault branch、unknown operation skip、mode fallbackを追加しない。
- 1000 decisionを超えるbatch APIは作らず、callerがboundary単位に明示callする。

## Verification

1. 3 layer×全mode precedence、5 boundary×2 source×3 operation applicabilityをCartesian fixtureで検証する。
2. 100 parallel evaluationが同じ入力へ同じbytesを返し、cross-Intent leak 0件であることを検証する。
3. union追加時にexhaustive switchとcontract fixtureがcompile failureになるtype testを置く。
4. 1 MiB＋1 byte、unknown variant、別completion instance receiptをfail／ignore規則どおり処理する。

## Traceability

| Requirement area | Design／Verification owner |
|---|---|
| SCL-CP-01／02 | closed config／mode unions、precedence Cartesian fixture |
| SCL-CP-03／04 | closed operation／boundary／source unions、5×2×3 fixture |
| SCL-CP-05／10 | sequential Completion Selector、chain test |
| SCL-CP-06／07 | call-local selected snapshot、cross-Intent test |
| SCL-CP-08／09 | stateless pure modules、dependency／process scan |
| SCL-CP-11／12 | typed invalid outcome、unknown variant test |
| SCL-CP-13／14 | contract expansion checklist、compile／distribution drift test |
