# Security Design — experiment-contract-provenance

## Design inputs

`performance-requirements.md` のbounded parser、`security-requirements.md` のblind isolation、`scalability-requirements.md` のclosed commands、`reliability-requirements.md` のcorruption boundary、`tech-stack-decisions.md` のlocal adapter、`business-logic-model.md` のtyped dispatcherを適用する。

## Validation architecture

`ProofPolicyRegistry`はcommand discriminatorをkeyに、必要なstateと既決proof validatorをexactly one登録する。start/freezeはactual-input manifest + forbidden-path scan、revealはT freeze receipt、record-skeletonはskeleton evidence、request-promotionはderived permissionを検証する。全command共通capabilityは作らない。

`RepositoryPathPolicy`はrelative lexical path、realpath containment、symlink traversal、owned-path allowlistを順に検査する。`RedactingReceiptWriter`はcredential、home path、sealed contentをdropし、安全なidentity / discriminatorだけを保存する。

## Isolation and trust

domain componentsはfilesystem / processを直接importせず、`ProvenanceStorePort`とtyped handler portsだけを受ける。adapterはclosed environment、networkなし、repository-scoped write rootで実行する。handler registry identityを起動時にhashし、unknown / duplicate / substitutionを拒否する。

## Security tests

path traversal / symlink、private Arm input、proof欠損 / cross-command proof、same transaction different bytes、handler substitution、error redactionをfixture化する。security failureからsuccess / verdictを生成しない。
