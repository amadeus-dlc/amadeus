# Domain Entities: harness-contract-and-regression

## Design Inputs

value定義は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`に基づく。runtime永続modelは追加しない。

## HarnessProjection

- Harness: Claude / Codex / Cursor / Kiro / Kiro IDE / OpenCode
- Source: canonical source path
- Target: generated distribution paths
- Semantics: directive、report、fallback、human reentry
- Invariant: generated targetをmanual sourceにしない

## ConductorSemanticContract

- U2 final route authorization correlation handling
- Quality ritual execution
- Grant-backed report
- Approved transition
- Await-approval prompt-only reentry
- Human continuation
- Invariant: harness rendering差がstate/audit outcome差を生まない
- Invariant: U2 route-intent binding gateが解決するまでschema statusはpending

## RegressionFixture

- Mode: solo / team / human
- Gate context: normal / phase-boundary / walking-skeleton / per-unit
- Race: none / expiry / revoke / issuer-intent / active cursor switch with same-stage target / receipt mismatch
- Expected directive
- Expected audit delta
- Expected state delta
- Expected invocation counts
- Expected non-target intent mutation count

## ContractSnapshot

- Directive schema/golden
- State transition result
- Audit event sequence/fields
- Process stdout/stderr/exit
- Invariant: team/human baselineは意図的変更なし

## VerificationCheck

- Command
- Scope: focused / full / drift
- Exit code
- Result: pass/fail
- Evidence timestamp
- Invariant: required checkのfailが1件でもあればUnit未完了

## DocumentationDecision

- Surface: help / doctor / reference / conductor
- Existing responsibility
- Required change: yes/no
- Rationale
- Verification fixture

## Relationships

- one canonical source → six HarnessProjection
- one ConductorSemanticContract → six HarnessProjection
- many RegressionFixture → one ContractSnapshot set
- many VerificationCheck → one convergence verdict
- DocumentationDecision → canonical document/test change or explicit no-change evidence

## Excluded Entities

HarnessSpecificGrantPolicy、ManualProjectionOverride、NonblockingFailedCheck、PrototypeDependencyを作らない。
