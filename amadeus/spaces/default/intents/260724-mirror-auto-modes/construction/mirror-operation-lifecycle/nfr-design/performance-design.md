# Performance Design — mirror-operation-lifecycle

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Budgets

local suppress／askはp95 100 ms、statusはnetwork除外p95 250 ms、CAS再評価は最大1回とする。createはread-only最大3＋mutation1、sync／closeも各3＋1、completionは最大9＋3、270秒＋local 1秒で停止する。

| Segment | Deadline／measurement |
|---|---|
| readiness version／auth | 各10秒 |
| find | 60秒 |
| view／create／edit／close | 各30秒 |
| create lifecycle | 最大110秒 |
| sync／close lifecycle | 各最大80秒 |
| CAS lock→conflict／pending | 5秒 |
| completion | 最大270秒＋local 1秒 |

## Execution

prompt返却前にexpected bindingをcommitし、lock／processを解放する。completionだけがsuccess後にsnapshotを再readする。failure／skip／blocked／abandoned後の同boundary後続operation callは0件である。別boundaryまたはmanualは同じ未完receiptのevidence reconciliationを明示的に許可する。

benchmarkはGitHub Actions `ubuntu-24.04` X64、同一image、pin済みBunで独立3 job、warm-up 100＋1,000測定、nearest-rank p95の3値中央値を使う。最大／最小比2.0超、image不一致、欠損はinconclusive failureとする。network待ち／human待ちは該当local metricから除外し、fake clockでend-to-end deadlineを検証する。

## Verification

PERF-OL-01〜08をfake clock、Gateway history、32 caller、上記3-job benchmarkで検証する。

## Review Iteration 2 Remediation

- prompt consumeとapproval-bearing prepared receiptを同一C3 transitionへ統合した。
- C6→C3公開transition依存と、attempted CAS winnerだけのpermit発行を固定した。
- Completion Driver／Reconciliation Selectorのrevision付きinterfaceを定義した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T08:57:23Z
- **Iteration:** 1
- **Scope decision:** none

call budget、completion chain、prompt binding、evidence reconciliationは概ね整合するが、component、authorization carrier、recovery、benchmark、capacity設計が実装可能な粒度に達していない。

### Findings

- [Major] C1〜C5 inventory、Completion Driver/Reconciliation Selectorのowner・依存・failure domain・shared resourceがない。
- [Major] auto/manual/prompt/repair consentからoperation permitへのcall shapeとatomic challenge consumeがない。
- [Major] effect別persisted state、claim CAS、outbox recovery、deadline/RPOを含むfailure matrixがない。
- [Major] Mirror chain停止とengine workflow継続の区別が曖昧。
- [Major] 下位deadline、CAS 5秒、benchmark protocolが欠落。
- [Major] state-capacity予約slot・置換・proof退避がない。
- [Minor] 同boundary追加call 0件と別boundary/manual reconciliation許可の限定がない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T09:00:50Z
- **Iteration:** 2
- **Scope decision:** none

deadline、capacity、workflow継続、cross-boundary区別、inventoryは解消。prompt approval carrierとC6/C3 responsibilityに残件。

### Findings

- [Blocker] prompt expected binding consume後、attempted前crashを回復するdurable authorization carrierがない。consumeとapproval prepareを同一C3 transactionにする必要。
- [Major] C6がattempted commit/CASを行うのにdependencyがC4/C5だけ。C6→C3またはC7 ownershipを固定する必要。
- [Minor] Completion Driver/Reconciliation Selectorのinterfaceとsnapshot revision handoffがない。
