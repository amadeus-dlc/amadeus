# Logical Components: grant-authorization-domain

## Inputs and Boundary

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`から、既存core内の論理境界だけを定義する。新serviceやAWS infrastructureは作らない。

## Component Inventory

| Component | Single owner path | Input → Output | Failure domain |
|---|---|---|---|
| Operating Mode Resolver | `packages/framework/core/tools/amadeus-lib.ts` | raw mode → `solo | team` | invalid env |
| Space Audit Snapshot Reader | `packages/framework/core/tools/amadeus-lib.ts` | project/space/pass observer → receipt lookup snapshot、またはowner/pass observer → fresh owner snapshot | registry/audit I/O |
| Standing Grant Projector | `packages/framework/core/tools/amadeus-lib.ts` | parsed events/clock → grant projection | malformed audit |
| Gate Eligibility Policy | `packages/framework/core/tools/amadeus-lib.ts` | gate context/grant → eligible/ineligible reason | policy mismatch |
| Solo Candidate Selector | `packages/framework/core/tools/amadeus-lib.ts` | projection/gate context → selected Grant Id or none | invalid grant |
| Receipt Ownership Resolver | `packages/framework/core/tools/amadeus-lib.ts` | parsed space snapshot/Route Id → exactly-one owner result | duplicate/missing receipt |
| Exact Grant Validator | `packages/framework/core/tools/amadeus-lib.ts` | owner snapshot/Grant Id/gate context/clock → verified or no-longer-authorizes | stale grant |
| Protected Audit Primitive | `packages/framework/core/tools/amadeus-audit.ts` | already-held owner lock/event fields → append receipt | append failure |
| Route Authorization Adapter | `packages/framework/core/tools/amadeus-orchestrate.ts` | run-stage directive/context → optional carrier pair | route/lock failure |
| Approval Transaction Adapter | `packages/framework/core/tools/amadeus-state.ts` | report carrier/state → approved or await-approval | state/audit failure |

## Dependency Direction

import方向は次に固定する。

1. `amadeus-audit.ts`は低レベルappend/parse primitiveだけを提供し、orchestrator/stateをimportしない。
2. `amadeus-lib.ts`はaudit primitiveとNode filesystemを使用してsnapshot readerおよびpure queryを提供し、orchestrator/stateをimportしない。
3. `amadeus-orchestrate.ts`はlib queryとaudit primitiveを呼び、gate存在確定後のrouteとworkspace→owner lock orchestrationだけを担う。
4. `amadeus-state.ts`はlib validatorとaudit primitiveを呼び、commit authorizationとstate mutationだけを担う。orchestratorをimportしない。

pure projector、eligibility、selector、ownership resolver、exact validatorはfilesystem/state CLI/active cursor/stderr/harnessを参照せず、typed snapshot/clockだけを入力にする。Space Audit Snapshot Readerだけがfilesystem adapterである。

commitではReceipt Ownership Resolverが`receipt-lookup` snapshotからownerを返した後、owner inner lockを取得し、Space Audit Snapshot Readerを`owner-revalidation` modeで再度呼ぶ。Exact Grant Validatorへ渡せるのは後者のfresh owner snapshotだけである。

## Lock and Blast-radius Map

- workspace outer lock: route receipt uniquenessとspace-wide owner cardinalityだけ。
- route owner inner lock: protected receipt raw appendと同owner audit writerの排他。
- owner intent inner lock: exact grant、revoke、approval state/auditだけ。
- team/human branch:solo outer lock componentを呼ばない。
- expected fallback: owner/non-owner双方のworkflow audit/state mutation 0。

## Test Ownership

pure componentはunit/property tests、lock/writer/transaction adapterはintegration tests、team isolationはgolden testsで検証する。observer/clock/UUID/barrierをtest seamとして注入し、production設定を追加しない。
