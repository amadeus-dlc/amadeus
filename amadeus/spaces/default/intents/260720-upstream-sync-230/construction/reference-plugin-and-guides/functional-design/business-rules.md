# Business Rules — reference-plugin-and-guides

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Reference source rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U11-01 | `plugins/test-pro/`がauthoring正本で、generated projectionを手編集しない。 | source ownership違反 |
| BR-U11-02 | fixtureは既決schema/seam/fragmentを実証する必要最小artifactだけを持つ。 | scope膨張を拒否 |
| BR-U11-03 | 新runtime API、第二parser、plugin内runtime実装を追加しない。 | U01/U09/U10重複を拒否 |
| BR-U11-04 | 具体slug/文言/fixture pathを公開contractにしない。 | 未承認互換面を拒否 |

## Lifecycle rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U11-05 | authoring→6面projection→temp compose→doctor→dropを一つのE2Eで閉じる。 | 分断fixtureをclosure evidenceにしない |
| BR-U11-06 | compose/dropはU10のno-clobber/atomic/record ownershipをそのまま使う。 | 新意味論を拒否 |
| BR-U11-07 | 宣言成果物だけを生成・検出・除去する。 | unrelated path mutationを拒否 |
| BR-U11-08 | success/failure後にtracked treeへ一時物を残さない。 | cleanup failure |
| BR-U11-09 | 6 package面と4 self-install面を別matrixで検証する。 | 6/4混同を拒否 |

## Documentation and ownership rules

| ID | Rule | Failure behavior |
|---|---|---|
| BR-U11-10 | guideはpath/namespace、対応面、deferred面、no-clobber、検証、6/4差を記載する。 | 必須面欠落 |
| BR-U11-11 | deferred面を実装済みと表現せず、marketplace等を追加しない。 | misleading/scope違反 |
| BR-U11-12 | U11はitems 21–22 evidenceを所有し、U12 ledger closureを行わない。 | ownership越境 |

## Traceability

| Input | 実質利用 |
|---|---|
| `unit-of-work.md` | BR-U11-01〜12のreference/E2E/guide/境界 |
| `unit-of-work-story-map.md` | U11 primary、U09/U10 consumer、U12集約 |
| `requirements.md` | 6面、宣言成果物、temporary 0、docs面/deferred |
| `components.md` | C4 referenceとC7 docs/tests、既存verification再利用 |
| `component-methods.md` | C4/C5既存seamのみをlifecycleへ使用 |
| `services.md` | packageとhost compose/drop workflowの接続 |

