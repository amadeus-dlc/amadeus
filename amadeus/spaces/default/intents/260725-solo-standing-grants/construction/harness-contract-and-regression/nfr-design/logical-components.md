# Logical Components: harness-contract-and-regression

## Inputs and Ownership

U3のNFR RequirementsとFunctional Designを入力とし、generated copyではなくcanonical pathへownerを置く。

## Components

| Component | Single owner path | Responsibility |
|---|---|---|
| Directive/report contract | `packages/framework/core/tools/amadeus-orchestrate.ts` | grant pair、target＋Reservation Id、strict wire |
| Approval/reservation core | `packages/framework/core/tools/amadeus-state.ts` | exclusive branch、targeted approval、consume recovery |
| Registry/reservation primitives | `packages/framework/core/tools/amadeus-lib.ts` | UUID解決、exact marker、atomic transition |
| Presence mint | `packages/framework/core/hooks/amadeus-mint-presence.ts` | trusted session promptからowner HUMAN_TURN |
| Harness projection | `scripts/package.ts` | harness manifestを発見しcanonical coreを全distributionへ生成 |
| Claude capability | `packages/framework/core/hooks/amadeus-mint-presence.ts` | native `session_id`を共通capabilityへ変換 |
| Codex capability | `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts` | normalized `session_id`をcore hookへforward |
| Cursor capability | `packages/framework/harness/cursor/hooks/amadeus-cursor-adapter.ts` | native `session_id`をcore hookへforward |
| Kiro CLI capability | `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts` | native `session_id`をcore hookへforward |
| Kiro IDE capability | `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` | stable IDE identityを取得し、欠落時unavailable |
| OpenCode capability | `packages/framework/harness/opencode/amadeus-opencode-plugin.ts`（新規） | native prompt eventのstable identityをcore hookへforward |

## Import and Failure Boundary

libはorchestrator/state/hookをimportしない。共通interfaceはcore mint側の`HostSessionCapability = { kind: "available"; sessionId: string } | { kind: "unavailable"; reason: string }`とし、各adapterはraw payloadをこのunionへ変換するだけでauthorizationを行わない。空・unstable identityは`unavailable`、core mintはaudit/runtime delta 0で返す。generated harnessは独自authorizationやstderr classifierを持たない。

projectionのcanonical rowsは次のliteral manifestである。

- `packages/framework/harness/claude/manifest.ts`
- `packages/framework/harness/codex/manifest.ts`
- `packages/framework/harness/cursor/manifest.ts`
- `packages/framework/harness/kiro/manifest.ts`
- `packages/framework/harness/kiro-ide/manifest.ts`
- `packages/framework/harness/opencode/manifest.ts`

OpenCodeの新pluginは同manifestの`harnessFiles`または`emit` expected setへ登録し、Kiro IDEは既存adapter/runtime/hook registrationを更新する。いずれも`bun scripts/package.ts --check`がprojection漏れを拒否する。

## Test Ownership

codec/state machineはunit/property、wire/lock/recoveryはintegration、全harness/policy/team/humanはmanifest-driven E2E、生成物はdrift checkで検証する。
