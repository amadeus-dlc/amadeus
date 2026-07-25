# Reliability Requirements — mirror-state-provenance

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Atomicity and Durability

| ID | Requirement | Verification |
|---|---|---|
| REL-SP-01 | lock内で最新documentを再読込し、expected revisionを比較する | parallel writer test |
| REL-SP-02 | state-changing transitionはrevisionをexactly 1増やし、documentを1 atomic renameで置換する | transition matrix |
| REL-SP-03 | no-opは`unchanged`でrevision／bytes／write countを変えない | idempotency test |
| REL-SP-04 | rename前のtemp write／file fsync／rename失敗は元fileをbyte-for-byte保持する | failure injection |
| REL-SP-05 | create receipt＋identity、create success＋provenance、repair＋challenge consumptionは各1 atomic update | crash-boundary tests |
| REL-SP-06 | Mirror block外のprefix／suffix bytesを完全保持する | arbitrary-byte fixture |
| REL-SP-07 | remote成功後のcomplete失敗でも永続`attempted`を残し、次回reconciliation可能にする | post-remote injection |
| REL-SP-08 | business stateと完全なaudit outboxを同じatomic commitに含め、directory fsync後だけaudit appendする | outbox boundary injection |
| REL-SP-09 | rename後directory fsync失敗は`durability-unknown`を返し、次回readで新旧実体へ収束する | power-loss seam |

## Transition Closure

- 全status／transition combinationをtable testし、未定義edgeを`invalid`にする。
- `pending + no-effect-confirmed`だけが`retry-after-no-effect`で同operation IDのattemptedへ戻る。
- `outcome-unknown` createはverified候補1件adopt以外で再createしない。
- absent receiptからのskipはevent／operation／operation ID／preparedAt／completedAtを同時保存する。
- `skipped-for-event | safety-blocked | abandoned`は同じcompletion boundaryのterminalである。
- warning解消は同operation successまたはhuman-gated repairだけが行う。

## Recovery Objectives

- State Storeは常駐serviceでないためmonthly availability／RTO SLAは非適用。
- RPO: parent directory fsync完了後に成功を返したtransitionはloss 0。rename前failureは未commit、rename後fsync failureは`durability-unknown`であり、未commitと断定しない。
- crash recovery: temp fileを正本へ昇格せず、canonical state fileだけを読む。
- parse invalid／CAS conflictで自動repairせず、typed evidenceを保持する。

## Observability

state mutationごとにevent key、operation ID、transition kind、next revision、digestを含むtransaction IDと完全な既存`ARTIFACT_UPDATED` projectionをoutboxへ同時commitする。directory fsync後だけauditへidempotent appendし、失敗時は`committed-audit-pending`としてoutboxを残す。次の任意operationはoutbox drainを先に行い、同ID＋digestを重複させずappendしてoutboxをclearする。audit eventはcommit済みstateだけを表す。

## Acceptance

1. reducer全edgeとfailure injection全境界でstate／auditの組を検証する。
2. parallel writerでtorn write、lost update、duplicate operationを0件にする。
3. marker mismatch／candidate ambiguity／repair replayでremote call 0件となる。
