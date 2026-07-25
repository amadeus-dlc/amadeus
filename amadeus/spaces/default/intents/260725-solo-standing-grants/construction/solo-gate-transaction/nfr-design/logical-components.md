# Logical Components: solo-gate-transaction

## Inputs and Boundaries

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`から単一ownerを定義する。

## Component Inventory

| Component | Single owner path | Input → Output |
|---|---|---|
| Directive Carrier Codec | `packages/framework/core/tools/amadeus-orchestrate.ts` | JSON/flags → validated carrier union |
| Authorization Input Classifier | `packages/framework/core/tools/amadeus-state.ts` | user/grant/target/mode → exclusive branch |
| Grant Result Wire Parser | `packages/framework/core/tools/amadeus-orchestrate.ts` | exit/stdout/stderr → approved/await/protocol/fatal |
| Grant Approval Transaction | `packages/framework/core/tools/amadeus-state.ts` | carrier + owner snapshots → approved/await |
| Intent UUID Resolver | `packages/framework/core/tools/amadeus-lib.ts` | space/UUID → exact in-flight registry row |
| Reservation Directive Codec | `packages/framework/core/tools/amadeus-orchestrate.ts` | await outcome → target UUID＋Reservation Id carrier、report flags |
| Presence Reservation Store | `packages/framework/core/tools/amadeus-lib.ts` | session ID/explicit Reservation Id＋target/stage → exact atomic transition |
| Presence Mint Core | `packages/framework/core/hooks/amadeus-mint-presence.ts` | trusted prompt/session/reservation → owner HUMAN_TURN |
| Targeted Human Approval | `packages/framework/core/tools/amadeus-state.ts` | user/target/minted provenance → owner approval |

## Import Direction

`amadeus-lib.ts` owns pure codecs/registry/reservation primitives and imports neither orchestrator nor state。orchestratorはturnをまたぐReservation Id carrierとprocess transport、stateは明示Reservation Idによるauthorization/mutation、core mint hookはtrusted prompt/sessionからのHUMAN_TURN mintを所有する。hook、orchestrator、stateはlibをimportするが相互importしない。stateはtarget UUIDやsession IDだけからreservationを探索するAPIを持たない。

## Failure Domains and Blast Radius

- malformed directive/wire: state mutation 0。
- grant invalidity: owner/non-owner audit/state mutation 0、reservationだけarmed。
- reservation failure: targeted approval 0、grant正本/state不変。
- owner approval failure: non-owner delta 0、minted reservation retryable。
- owner completion後のconsume failure: exact owner provenanceからmarkerだけを冪等consume。
- Reservation Id欠落/不一致: targeted mutation 0、別reservation探索0。
- team/human normal branch: solo component invocation 0。

## Test Ownership

codec/classifier/reservation state machineはunit/property tests、subprocess/wire/lock/targeted continuationはintegration tests、team/human/per-unitはgolden/E2Eで検証する。
