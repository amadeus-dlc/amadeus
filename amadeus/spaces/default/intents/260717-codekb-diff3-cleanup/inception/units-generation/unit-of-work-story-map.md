# Unit of Work Coverage Map — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

## Story Availability

User Stories stageはengine planでSKIPされ、storiesは0件である。そのため、storyを架空に生成せず、`requirements.md` のFR-1〜FR-5とNFR-1〜NFR-4を `U001-codekb-hygiene-verification-handoff` へ全数対応付けするcoverage mapとする。

## Functional Requirement Mapping

| Requirement | Unit | Coverage |
|---|---|---|
| FR-1 対象とmarker clean条件 | U001 | 対象2 paths、4 marker語彙、最新H2、履歴H2の件数とstop条件 |
| FR-2 contentと系統の分離 | U001 | fix ancestryとcontent scanを別verdictで記録しblind reapplyを禁止 |
| FR-3 lifecycle recordの完了 | U001 | 実行stageのartifacts / questions / review / sensors / §13 / gate / commit / push |
| FR-4 main着地handoff | U001 | 起票者以外の独立した2名のreview、CI green、human approval、外部操作禁止の境界。reviewer数または適格性不足はfail-closed |
| FR-5 post-landing verificationとclose順序 | U001 | landed mainの再計測後にだけclose-eligibleとする |

## Non-Functional Requirement Mapping

| Requirement | Unit | Coverage |
|---|---|---|
| NFR-1 決定性と再現性 | U001 | ref / SHA付き全数走査、path / pattern / count保持 |
| NFR-2 監査性とtraceability | U001 | Issue、git ref、audit、questions、review、sensor、§13、gate、push SHAの連結 |
| NFR-3 変更の局所性 | U001 | CodeKB hygiene / record限定、runtime / API / AWS / UI変更なし |
| NFR-4 security / compliance非回帰 | U001 | 公開Markdown / git metadata限定、no-AI-mergeとhuman-presence維持 |

## Coverage Verification

- 全user stories assigned: 該当なし(0 / 0)。
- 全functional requirements assigned: 5 / 5。
- 全non-functional requirements assigned: 4 / 4。
- 全Units with coverage: 1 / 1。
- Cross-unit stories / requirements: 0件。
- Orphan Unit: 0件。
- Orphan requirement: 0件。

## Ordering Boundary

storyが0件のためunit内story implementation orderは非該当。`component-dependency.md` のD1〜D8は証拠の論理的先行関係であり、本stageはBolt sequencing、critical path、exit conditionsを確定しない。これらはDelivery Planning 2.8へdeferする。
