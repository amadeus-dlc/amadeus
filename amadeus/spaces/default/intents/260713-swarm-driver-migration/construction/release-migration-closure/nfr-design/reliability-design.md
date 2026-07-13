# Release & Migration Closure Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。信頼性はall-match closure、same-tree provenance、immutable report、single Issue publisher、redacted native indexによりfalse release closureを0件にすることで定義する。availability SLA、backup、multi-regionはlocal/CI checkerに非適用である。

## Reliability patterns

| Pattern | Component | Invariant |
|---|---|---|
| fixed manifest provenance | input digester/binding guard | output/runtime自己参照0 |
| production assembly check | registry closure check | 3 provider/4 driver/2-1-1 exact |
| write-then-read-only verify | projection receipt validator | hand edit/write-only green 0 |
| candidate-bound receipts | receipt schema/binding | stale/duplicate/別worktree green 0 |
| all-match aggregation | domain checks + finding aggregator | red domainを隠すclosed 0 |
| sealed native index | live validator | 4 driver不足のfake補完0 |
| single-writer Issue ensure | issue state machine | duplicate/誤reference 0 |
| immutable closure seal | report sealer | input変更後の旧report上書き0 |

## Closure conjunction

closed reportはregistry、projection、docs、platform、live、Issueの6 domainがすべてgreenで、FR-01〜FR-26が各1件以上のvalid test/live evidenceへ逆引きされ、全receiptが同一repository/tree/contract/candidateへ束縛される場合だけ構築できる。

macOS/Linux deterministic、macOS 4-driver credentialed live、4 harness dist、Claude/Codex self-install、production registry 4 driverのいずれもmissing/red/stale/extra/unknownを許さない。Windows成功は要求も表明もしない。

## Failure and recovery

| Failure | Result | Recovery |
|---|---|---|
| registry incomplete/fake | blocked | owner U-01〜U-05でsame-tree correction |
| projection/docs drift | blocked | source修正→generate→read-only check |
| macOS/Linux receipt missing/red/stale | blocked |同一candidate replacement receipt |
| native live missing/redaction failure | blocked | provider Unit sealed replacement summary |
| coverage missing/skip/unimplemented | blocked | valid evidence ID追加 |
| Issue open 0 | single create + re-search | valid reference seal |
| Issue multi/closed-only/race | blocked、mutation 0 | human/external state resolution |
| input tree/contract change |旧report immutable | new candidate全再評価 |

全findingをcanonical aggregateし、blockedをwarning/partial closedへdowngradeしない。provider behavior/parser/checkpoint/refereeをU-06で再実装せず、missing evidenceをclosed owner codeでroutingする。

## Observability and verification gate

finding/reportはcandidate、repository/tree/contract、domain/code/subject、expected/observed digest、platform/run SHA、driver/harness/profile、closed verdict/countを相関する。provider payload、prompt、credential、raw CI log、absolute home/worktreeを含めない。

- deterministic suiteでregistry/projection/docs/platform/live/Issue/coverageのhappy/failure matrixを検証する。
- macOS/Linux receipts、macOS 4-driver live、FR-01〜FR-26、same-tree/read-only driftをrelease gateにする。
- Issue duplicate/closed/conflict時の追加mutation、0.2.0削除のscope内実装、raw/secret保存、fake/skip/floor/legacy live昇格、Windows成功表明をmerge blockerにする。
- 同一canonical inputのstatus/finding/report digest一致を100% property testする。
