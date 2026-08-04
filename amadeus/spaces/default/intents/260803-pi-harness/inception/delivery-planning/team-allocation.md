# Pi Coding Agent対応 — Team Allocation

## 配置方針

Team Formationはscope上SKIPのため、全Boltの実装ownerを`amadeus-developer-agent`とする。stageごとのarchitect、quality、devsecops reviewer/supportはstage graphに従い、恒久mobや架空の外部teamとして扱わない。人間はB1 walking-skeleton gate、TUI dogfood、Construction autonomy選択、最終formal evidenceの承認境界を所有する。

各Unit/Boltは隔離worktreeを使い、同時実行上限は4とする。ただし`bolt-plan`ではB1単独ゲートと真の依存によりready Boltが同時に複数生じないため、予定上の最大同時builderは1である。将来DAGが変わる場合だけready setを最大4まで並列化し、依存を越えて先行しない。

## Bolt別allocation

| Bolt | Primary owner | Stage support / review | Human responsibility |
|---|---|---|---|
| B1 | `amadeus-developer-agent` | architect、quality、devsecops | Pi TUI入力、walking-skeleton承認、autonomy選択 |
| B2 | `amadeus-developer-agent` | architect、quality | transaction failure/recovery結果の確認 |
| B3 | `amadeus-developer-agent` | architect、quality、devsecops | trustと導入対象の承認 |
| B4 | `amadeus-developer-agent` | architect、quality | remediationの妥当性確認 |
| B5 | `amadeus-developer-agent` | product/architect観点、quality | 利用者向け記述の確認 |
| B6 | `amadeus-developer-agent` | quality、devsecops | provider/auth、TUI dogfood、formal green承認 |

## Worktree・変更所有権

- B1はharness manifest/skill/bootstrap、Pi lifecycle、child driverを同一Boltで統合するが、Unitごとのfile ownershipとtest asset ownershipを維持する。
- B2はgeneric setup transaction filesだけを所有し、Pi payloadを編集しない。
- B3はPi setup/package projectionとgenerated registrationを所有し、transaction algorithmを再実装しない。
- B4はdoctor dispatch/checkを所有し、trustやprovider設定を自動変更しない。
- B5はguideとcatalog/link checksを所有し、formal evidenceを捏造しない。
- B6はcross-unit E2E/live/evidenceを所有し、各Unitの局所fixtureを複製しない。
- `dist/`はauthored sourceから再生成し、直接編集しない。並列化が可能になった場合はtest番号とgenerated surfaceのmerge ownershipを事前予約する。

## Integrationとレビュー境界

各BoltはTDDのRed→Green、対象test、`bun run typecheck`、`bun run lint`、関連drift guardを満たしてから統合する。B6でfull blocking suite、distribution/self-install drift、coverage、plugin-conformanceを実行する。PRやreleaseからversion bump/tag/npm publishは行わず、公開releaseは既存の手動workflowへ残す。

`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`が所有権と順序の根拠である。`stories`と`mockups`はscope上不存在、`team-practices`はsingle AI owner、TDD、worktree隔離、最大4並行、手動release境界として適用した。
