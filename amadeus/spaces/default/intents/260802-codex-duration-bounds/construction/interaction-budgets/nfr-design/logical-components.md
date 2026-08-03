# Logical Components — interaction-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Component Inventory

| Owner package | Component | Public contract／responsibility |
|---|---|---|
| C4 interaction application | Interaction Policy Resolver | `resolve(receipt, depth): EffectivePolicy | PolicyUnavailable` |
| C4 interaction application | Interaction Budget Adapter | `reserve(request): ReserveReceipt | Exhausted | Refusal` |
| C4 interaction application | Transition Coordinator | 唯一のorchestration owner。C2 commitとC7 side effectを直列化 |
| C2 execution core | Interaction Repository | `reserveOrGet`、`claim`、`commitTransition`、`queryReceipt`。canonical auditとlockを所有 |
| C2 execution core | Interaction Index | auditから再構築可能なsemantic key projection |
| C2 security port | Answer Fingerprint Port／Key Vault | canonical HMAC、repository共通key、availability |
| C7 harness adapter | Renderer／Reviewer Port | `deliver`、`dispatch`、`queryEffect`のnative capability fact |
| C4 interaction application | Summary Projector | terminal outboxを既存approvalへsummaryId付き投影 |

呼出方向は`C4 Transition Coordinator → C2 Interaction Repository`と`C4 Transition Coordinator → C7 Port`だけとする。C2はC7を呼ばず、C7はC2へcommitしない。1 interactionの唯一のflowは次の通り。

1. C4がC2 `reserveOrGet`と`claim`を呼び、lock解放済みreceiptを得る。
2. C4がlock外でC7 `deliver | dispatch`を呼ぶ。
3. C4がC7 result/effect factをC2 `commitTransition`へ渡す。
4. terminalならC4 Summary ProjectorがC2 outboxを既存approvalへ投影する。

この依存方向によりC2↔C7循環と二重dispatch ownerを禁止する。

## Failure Domain と Degradation

| Failure | Blast radius | Degradation |
|---|---|---|
| C2 lock／audit unavailable | active intentの新interaction | reserve前に停止。native side effect 0件 |
| Interaction Index破損 | 当該intentのlookup startup | auditから再構築。失敗時は当該intentだけ停止 |
| Key Vault unavailable | 既存回答bindingを要するinteraction | interactionをunavailable、暗黙rekeyなし |
| Renderer failure | 当該question delivery | 1回消費、failed summary。別stage／auditは継続可能 |
| Reviewer effect unknown | 当該review iteration | 再dispatchせずunavailable summary |
| Summary projection failure | approval表示 | outbox再実行。terminal stateとsummary payloadは保持 |
| Calibration receipt欠落 | #1999 policy activation | policy-unavailable。候補値を有効化しない |

## Isolation

rendererとreviewerはID、counter、severity policyを所有しない。HMAC key failureはinteractionだけをunavailableにし、canonical auditや他stageを破損させない。
