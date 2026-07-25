# Logical Components — mirror-operation-lifecycle

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Inventory

| Component | Responsibility |
|---|---|
| C1 Config Reader | 3-layer strict mode resolution |
| C2 Policy | boundary／prompt／completion decision |
| C3 State Store | receipt、warning、prompt、outbox atomicity |
| C4 Provenance | marker／ownership／candidate classification |
| C5 Gateway | explicit GitHub transport／effect |
| C7 Boundary Coordinator | config／state／policy composition |
| C6 Operation Executor | guard、permit、Gateway sequence |
| C8 Presentation | prompt、status、Issue content |
| C7 internal Completion Driver | bounded success-only chain、C7 snapshotだけ共有 |
| C7 internal Reconciliation Selector | oldest eligible pending、C3 read-only snapshot入力 |

## Dependencies

C7→C1/C2/C3/C6/C8、C6→C3/C4/C5の一方向とし、engine routingをimportしない。C7がC8で描画したIssue contentをC6へ注入する。C6はC3のoperation transition APIだけを使いcodec／file portへ直接依存しない。

shared mutable resourceはC3 state file／lockだけで、C7 internal moduleはstateを保持しない。C5 process、C3 file、C8 renderingを別failure domainとし、C6 permitがremote blast radiusを1 repository／1 operationへ限定する。C7 failureはMirror outcomeに閉じ、engine stateを変更しない。

```text
CompletionDriver.select({ snapshot, snapshotRevision, completionBoundary })
  -> { operation, expectedRevision } | terminal

ReconciliationSelector.select({ snapshot, snapshotRevision, triggerEvent })
  -> { receiptKey, originalEvent, operationId, expectedRevision } | none
```

両interfaceはimmutable C3 snapshotとそのrevisionを同時に受け、stateを保持／writeしない。返した`expectedRevision`はC6→C3 CASへそのまま渡し、revision不一致時はC7が最新snapshotで最大1回だけ再選択する。

## Failure Domains

local guardはremote前、Gateway failureはtyped effect、state failureはattempted receipt、presentationはsecret-free DTOへ隔離する。

## Verification

decision table、call order、permit winner、prompt binding、completion chainをfake portsで検証する。
