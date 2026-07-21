# Tech Stack Decisions — workspace-inspection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存workspace detector/formatterを再利用し、新技術を追加しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime/Language | Bun 1.3.13 / TypeScript ESM | 既存CLI、filesystem、tests、packagingと一致。 |
| Public seam | `inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules` | C3の正準3関数へ責務を閉じる。 |
| Result type | `classified | inconclusive`判別union | incomplete observationを型でcommit pathから排除。 |
| Filesystem | 既存read-only I/O port | fake stat/read/lstatでfailureを決定的に検証。 |
| Projection | 既存birth/detect/doctor/audit formatter | 同一snapshotと既定bytesを維持。 |
| Packaging | manifest-driven 6 harness / 4 self-install | source正本と生成境界を維持。 |
| Testing | `bun:test`、golden、filesystem integration runner | pure parserと実temp treeをintegration-firstで検証。 |

## 追加しない技術

新dependency、service、database、network、UI、filesystem index/watcher、submodule client、persistent scan cache、別consumer scanner、新audit event、retention/SLOを追加しない。

## Source・test ownership

path/parser/classificationはunit、real temp tree・permission・birth reject・4 consumer projectionはintegration、6 harness projectionはpackage checksで検証する。U12は全体ledger集約だけを担い、U06の機能実装/targeted fixturesを移さない。

push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後のin-process seam、waiverは既決証拠条件を満たす残余行だけに限定する。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U06-01〜24、`business-logic-model.md`の目的/C3境界、`requirements.md`のNFR-3〜8、`technology-stack.md`のruntime・test・distribution構成に対応する。
