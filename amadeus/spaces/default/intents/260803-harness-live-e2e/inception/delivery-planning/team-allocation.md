# Team Allocation — ハーネス横断 live E2E

入力参照: `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`。`stories`、`mockups`、`team-practices`成果物は未生成で、Team FormationもSKIPされたため、agent personaとspace memoryの役割規律を用いる。

## Allocation Principles

- 全11 Boltの実装ownerは`amadeus-developer-agent`とする。各Boltは独立worktree・branch・PRを持つ。
- 同時active builderは最大4。batch境界を越えた先行作業は行わない。
- `amadeus-architect-agent`はcomponent ownership、DAG、C4/C6依存方向を検証する。
- `amadeus-quality-agent`はcontract test、failure injection、terminal evidence、must-green判定を支援する。
- `amadeus-devsecops-agent`はcredential/env isolationとsecret非流出の確認が必要なBoltを支援する。
- 人間maintainerはwalking-skeleton gate、外部CLIの明示opt-in、利用可能なcredential substrate、evidence Issue受入を裁定する。

## Bolt-to-Mob Assignment

| Batch | Bolt | Primary builder | Required support | Worktree slot |
|---|---|---|---|---|
| 1 | B01 / U01 | amadeus-developer-agent | architect、quality、devsecops | 1 |
| 2 | B02 / U02 | amadeus-developer-agent | quality、architect | 1 |
| 3 | B03 / U03 | amadeus-developer-agent | quality、devsecops | 1 |
| 4 | B04 / U04 | amadeus-developer-agent | quality、devsecops | 1 |
| 4 | B05 / U05 | amadeus-developer-agent | quality、devsecops | 2 |
| 5 | B06 / U06 | amadeus-developer-agent | quality、devsecops | 1 |
| 5 | B07 / U07 | amadeus-developer-agent | quality、architect | 2 |
| 5 | B08 / U08 | amadeus-developer-agent | quality、devsecops | 3 |
| 5 | B09 / U09 | amadeus-developer-agent | quality、devsecops | 4 |
| 6 | B10 / U10 | amadeus-developer-agent | architect、quality | 1 |
| 6 | B11 / U11 | amadeus-developer-agent | architect、quality | 2 |

## Ownership and Handoffs

| Handoff | Producer | Consumer | Acceptance |
|---|---|---|---|
| Production contract | B01 | B02〜B11 | C1〜C4/C7〜C9 public APIとCodex C5/C6がgreen |
| Adversarial test kit | B02 | B03〜B11 | reusable fake/negative/failure-injection suite green |
| Claude family seam | B03 | B04/B05 | project-only config/auth declarationとprint receipt確定 |
| Phase 1 closure | B04/B05 | B06〜B09 | SDK/TUIそれぞれ`closure-committed`またはevidence Issue、registry/ledger/matrix整合 |
| Phase 2 closure | B06〜B09 | B10/B11 | Kimi `closure-committed`、Kiro各経路`closure-committed`またはevidence Issue、registry/ledger/matrix整合 |

builderはconsumer Bolt開始時にhandoff evidenceを検証し、live successではcleanup barrierとledger commitを経た`closure-committed`、conditional failureでは受入条件付きIssue evidenceが不足していれば前batch ownerへ戻す。後続Boltで前Unitのproduction ownershipを奪わない。

## Parallel Work Protocol

- Batch 4はB04/B05を2 worktreeで並行実行する。
- Batch 5はB06〜B09を4 worktreeで並行実行する。共有registry/ledger/projectorへの変更はowner-stamped entryと生成処理で統合し、手編集競合を避ける。
- Batch 6はB10/B11を2 worktreeで並行実行する。
- 各PRは対象Unitの変更と検証だけを含み、squash mergeする。別Boltの差分を取り込む場合は依存PRのmerge後にbaseを更新する。
- batch完了判定は個別PRのmergeだけでなく、全Boltのterminal evidenceとclosure matrixの整合を条件とする。
