# Reliability Requirements — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Workflow Continuity

| ID | Requirement | Verification |
|---|---|---|
| REL-OL-01 | 全Mirror outcomeは`workflowMayAdvance=true`を返し、engine transitionをrollbackしない | failure matrix |
| REL-OL-02 | configuration／state／provenance／landing failureはremote mutation 0件 | guard injection |
| REL-OL-03 | GitHub failureはpending／warningを保持し、次eligible boundaryでmodeに従う | boundary replay |
| REL-OL-04 | `off`はpendingを削除せずretryを抑止する | mode transition test |
| REL-OL-05 | same event skipは再質問せず、別eventは再評価する | resume test |
| REL-OL-06 | completionは前段success時だけ次へ進み、failure／skip／blocked／abandonedで停止する | chain matrix |

## Idempotency and Reconciliation

- fresh createはCAS `claim-create-attempt` winnerだけがremote createする。
- no-effect-confirmedは専用retry transition後だけ同operation IDで再実行する。
- outcome-unknown createはverified候補1件だけadoptし、0／複数はblockする。
- syncはremote body一致、closeはremote closedを観測した場合PATCHなしでcompleteする。
- body不一致／open時は`claim-observed-retry` winnerだけが再PATCHする。
- current trigger eventと元operation event／IDを同時保持し、新receiptを作らない。
- state audit outboxが未drainなら新remote operation前に回復する。

## Failure and Recovery Targets

| Failure | Detection deadline | Persisted result | Workflow | Re-evaluation |
|---|---:|---|---|---|
| `gh` not installed | spawn時、10秒未満 | prepared＋not-started warning | continue | install後のeligible boundary／manual |
| unauthenticated | readiness 10秒 | prepared＋not-started warning | continue | auth後のeligible boundary／manual |
| permission | operation deadline内（find 60秒、他30秒） | pending／safety-blocked＋warning | continue | permission修復後manual／eligible boundary |
| network／DNS／timeout（`not-started`） | 同deadline内 | prepared＋warning | continue | readinessから再評価 |
| network／DNS／timeout（`no-effect-confirmed`） | 同deadline内 | pending＋effect | continue | 専用retry transition後だけ再実行 |
| network／DNS／timeout（`outcome-unknown`） | 同deadline内 | pending＋safety-blocked warning | continue | createはcandidate、sync／closeはremote view reconciliationだけ |
| rate limit | 同deadline内 | pending＋retryable warning | continue | rate-limit解除後eligible boundary／manual |
| API／command | 同deadline内 | pending／safety-blocked＋classification | continue | effect確認後eligible boundary／manual |
| local state pre-remote | local 5秒以内 | remote 0、I/O warning | continue | filesystem修復後manual／eligible boundary |
| local state post-remote | local 5秒以内 | attempted＋safety-blocked | continue | remote evidence reconciliation |
| audit outbox drain | local 5秒以内 | committed state＋audit pending | continue、new remote 0 | 任意次操作の先頭／manual status |

- failure matrix全行でAI-DLC workflow継続率100%、pending／warningのRPOはdirectory fsync成功後0 lossとする。
- 外部修復／次eligible boundaryの時刻は利用者workflow依存でSLOを置かない。manual commandは修復直後に利用可能で、background retryは0件とする。
- duplicate Issue、wrong-repository edit、unsafe closeは全fixtureで0件。
- remote成功後local failureは即時`safety-blocked`、次boundaryのremote evidenceでのみ収束する。
- CAS conflict再評価は最大1回。それでも競合ならpendingへ戻し、spinしない。
- warning clearは同operation success／human-gated repairだけに限定する。

## Observability

開始、成功、失敗、skip、reconciliationはState Unitのtransactional outboxから既存`ARTIFACT_UPDATED`へcommit後投影する。Lifecycleは全C3 mutationへ`MirrorAuditContext`を渡す。outbox pending中はstatusへ監査未収束を表示し、新remote mutationを開始しない。

## Acceptance

1. create／sync／closeのpre／remote／post failure injection全境界を検証する。
2. same operation再入でremote resultとaudit eventが重複しない。
3. final sync failure後のclose callは0件で、Issueはopen、workflowは完了可能となる。
