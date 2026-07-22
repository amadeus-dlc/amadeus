# Logical Components — sealed-fixture-registry

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、Registryのproof/scan/seal/reveal/promotion責務を配置する。arm code、oracle、promotion時機、採否は所有しない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `RegistryRevisionCoordinator` | serial proof/scan/seal lifecycle | deadlines、Git/test ports |
| `ProofRunnerAdapter` | closed Git environmentとfalling proof receipts | isolated worktree、process port |
| `ManifestStreamPipeline` | bounded hashと3分類scan fan-out | fixed scanner、SHA-256 |
| `ScanPolicy` | manifest bijectionとzero-finding判定 | stream pipeline |
| `RegistryTransactionStore` | immutable successor publishとlock | filesystem flush/sync/rename |
| `ReservationStoreAdapter` | physical preallocation、ACTIVE/CLOSED/ABORTED | transaction store、capacity port |
| `ArmFilesystemSandbox` | arm read allowlistとsealed root不可視化 | platform sandbox capability |
| `DisclosureAuthorizer` | event/grant binding | Coordinator events |
| `DisclosureMaterializer` | allowlisted atomic materialization | transaction store、sealed records |
| `PromotionValidator` | permission、D-COUNT、全identity照合 | revision index |
| `RegistryRecovery` | crash lookup、resume、verified-stale abort | transaction store、liveness port |

## Dependency direction

Coordinatorはproof/scan結果を受けてstoreへimmutable recordを渡すが、arm codeへsealed pathを渡さない。`ArmFilesystemSandbox` はsealed/Registry rootをarm process namespaceから除外し、Materializerだけがread capabilityでcommitted grantからworktreeへbytesを出す。PromotionValidatorは両freeze/skeleton permissionを検証する。Recoveryは既存bytesを書換えずsuccessor eventだけをappendする。

## Test seams

Git/process/scanner/filesystem/capacity/livenessをport化し、temporary repositoriesで7/5 closure、scan drift、grant replay、reservation crash、atomic lifecycleを検証する。新規runtime dependency、network、credential readは導入しない。
