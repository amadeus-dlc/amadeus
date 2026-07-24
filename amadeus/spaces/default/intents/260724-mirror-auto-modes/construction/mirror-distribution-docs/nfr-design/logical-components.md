# Logical Components — mirror-distribution-docs

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Inventory

| Component | Responsibility |
|---|---|
| Projection Registry | surface artifact、wrapper／registration、dist／self-install path、parity、golden owner、scan policy、docs entry |
| Package Generator | dist candidate |
| Promote Generator | self-install candidate |
| Transaction Coordinator | lock、journal、commit／recover、read session |
| Digest Validator | read session経由のraw bytes／golden matrix |
| Public Scanner | read session経由のsecret／path sentinel |
| Docs Contract Validator | read session経由のtopic／semantic marker parity |

## Dependencies

Package／Promote／Transaction Coordinatorは同じProjection Registryをimportする。各surfaceは`surfaceId`とartifact entryを持ち、artifact entryは`kind: tool | skill | wrapper | registration`、core source path、dist path、self-install stance/path、`parity: raw-bytes | golden`、golden owner path、scan policyを所有する。docs entryはlocale、`guide | reference`、source path、topic／marker policy、scan policyを所有する。scanner、validator、generatorが別のsurface／path listを持つことを禁止する。

Transaction Coordinatorは`openReadSession(purpose)`でopaque token、immutable registry snapshot／digest、registry内path限定の`readFile`、許可public root限定の`listPublicRoot`を提供する。Digest Validator、Public Scanner、Docs Contract Validatorはread-session portへだけ依存し、filesystem adapterを直接importしないことをarchitecture testで強制する。Completeness Validatorは`listPublicRoot`の実path集合とRegistry期待集合の差分を所有する。Transaction Coordinatorはgenerator outputを受けるがruntime Mirror state／Gatewayをimportしない。Docs ValidatorはC8 `MIRROR_USER_CONTRACT`を一方向参照する。

## Failure Domains

generation、transaction、scan、docs validationを分離し、いずれのfailureもreleaseを止めるがAI-DLC runtime workflowを変更しない。Registry schema不整合、列挙差分で検出した未登録／欠落artifact、direct filesystem readはbuild-time failureとする。

## Verification

component単位test、dependency-direction test、Registry completeness testと、6 dist＋4 self-install＋4 docsのend-to-end release gateで検証する。
