# Team Allocation — archived intent lifecycle

上流の `team-practices` を適用し、Team FormationはSKIPのためnamed human mobを捏造しない。`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`を実行境界の根拠とする。`stories`と`mockups`はSKIP。

## Bolt assignments

| Bolt | Unit | Owner | Review/approval boundary |
|---|---|---|---|
| Bolt 1 | status-registry | amadeus-developer-agent | contract tests、corpus、dist drift、PR human review |
| Bolt 2 | lifecycle-transaction | amadeus-developer-agent | failure injection、atomicity evidence、PR human review |
| Bolt 3 | guard-integration | amadeus-developer-agent | falling proofs、packaging/corpus、PR human review |

## Working model

- Bolt間は直列。Unit間に独立な組はなく、`amadeus-lib.ts`と`amadeus-state.ts`を共有するため並行実装しない。
- 各Bolt内ではsource・tests・documentationを同一ownerの責務として同期する。
- base/targetは`main`、短命branch、squash mergeを使用する。
- PRマージは人間の明示承認を必要とする。AIは承認を代行しない。
- Construction swarmを使用する場合も、一度にactiveにするUnitは1つだけとする。

## Handoff contract

各Bolt ownerは上流要件、設計、Unit境界、前Boltの公開contractを受け取り、Definition of Doneと実測証拠を次Boltへ渡す。設計逸脱や仕様変更は実装せず停止し、所定の裁定へ戻す。
