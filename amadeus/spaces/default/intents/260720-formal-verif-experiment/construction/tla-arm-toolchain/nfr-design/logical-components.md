# Logical Components — tla-arm-toolchain

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。TLC acquisition/model/run/parseを所有し、fixture identity、TS oracle、eligibility、winnerを知らない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `AcquisitionPolicy` | descriptor/redirect/cap検証 | HTTPS port |
| `TlcArtifactAcquirer` | bounded HTTPS streamとdownload outcome | policy、stream port、SHA-256 |
| `AcquisitionLifecycleStore` | lock normal/stale recovery、physical reservation lifecycle、cache/quarantine唯一publish | filesystem transactions、capacity / liveness ports |
| `VerifiedArtifactCache` | immutable cache receiptのread/reverify | `AcquisitionLifecycleStore` layout、SHA-256 |
| `JdkSnapshotVerifier` | JAVA_HOME immutable snapshot、deadline内再hash、capability | filesystem、process version port |
| `FiniteModelGenerator` | fixed profileからmodule/cfg/source map | public contract bundle |
| `OfflineTlcSandbox` | network denyとclosed environment | platform sandbox provider |
| `TlcProcessAdapter` | array argv、deadline、raw streams | verified snapshots、U3 process port |
| `TlcStreamParser174` | closed grammarとproof/counterexample | incremental decoder |
| `TlcVerdictNormalizer` | DETECTED/NOT_DETECTED/HARNESS_ERROR | parser result、profile identity |

## Dependency direction

Acquirerだけがnetwork portを持ち、`AcquisitionLifecycleStore`だけがlock、reservation、cache、quarantineを変更する。`VerifiedArtifactCache`はread/reverify専用である。runnerはverified local identitiesだけを受ける。Generatorはfixture情報を受けず、parserはraw bytesを失わない。Normalizerはexit code単独でverdictを作らない。U3 public port依存の未再review履歴を保持し、integration readinessを先取りしない。

## Test seams

HTTPS/filesystem/network sandbox/JDK/process/clock/streamをport化し、acquisition、offline isolation、finite profile、parser split invariance、complete explorationを独立fixtureで検証する。
