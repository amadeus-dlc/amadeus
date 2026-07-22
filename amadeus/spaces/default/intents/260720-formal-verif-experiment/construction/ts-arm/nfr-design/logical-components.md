# Logical Components — ts-arm

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。blind TS checkerを所有し、TLA/skeleton/fixture/eligibility/winnerを知らない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `RuntimeSnapshotVerifier` | immutable Bun/fast-check/source receipt | filesystem/hash |
| `ArmSFilesystemSandbox` | read/write/network isolation | platform sandbox |
| `MixedRadixUniverse` | 5,760 streaming tuples/coverage | public descriptor |
| `IdentityValidationMatrix` | 160 precedence cells | public contract |
| `PredicateOracle` | closed 7 properties/brands | opaque subject adapter |
| `PbtRunner` | seed100、shrink/replay | fast-check snapshot |
| `TsExecutionClaimStore` | ACTIVE/RESUMED/CLOSED/ABORTED | filesystem/liveness |
| `CoverageProofStore` | immutable proof先行commit、U3 bundle再読、handoff receipt lifecycle | U3 public port |

## Dependency direction

Sandboxだけがsubjectを可視化し、oracleはfixture期待値を受けない。CoverageProofStoreはcore/identity/PBT全proofなしにNOT_DETECTEDを作らない。U3未再review履歴を保持しintegration readinessを先取りしない。

## Test seams

filesystem/sandbox/runtime/subject/clock/evidenceをport化し、cardinality、brands、PBT replay、claim crash、blind forbidden pathを検証する。
