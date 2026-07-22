# Security Design — reference-plugin-and-guides

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Source・host integrity

`plugins/test-pro/`だけをauthoring正本とし、U01でuntrusted plugin inputとしてvalidationする。projectionはU09の既存generatorだけが行い、generated outputを第二正本にしない。compose/doctor/dropはU10のno-clobber、三面atomicity、record-owned dropをそのまま消費する。

fixtureは宣言成果物だけを生成・検出・除去する。unrelated host bytes、record外path、user-authored contentを変更しない。same-name、malformed、unknown seamはU10のloud rejectとして観測し、failureをsuccess/advisoryへ丸めずhost/record/auditを不変にする。

## Cleanup・documentation controls

temp rootとtracked source treeを分離し、success/failure後にtracked一時物を残さない。新cleanup/failure policyを作らず、既存temp filesystemとtransaction境界を使用する。

guideはupstream README/CHANGELOGをコピーせず、Amadeus path/namespaceと既存failure contractへ再著作する。必須面としてsupported lifecycle、no-clobber、failure時三面不変、record-owned drop、local/temp verification、6 package対4 self-installの差を明示する。marketplace、lockfile、agents/scopes/memory/knowledge、`when`評価をsupportedと誤表示しない。新permission、credential、network、dependency、service、audit event、retentionは追加しない。

## Control matrix

| Threat | Control |
|---|---|
| generated手編集 | canonical authoring source＋U09 projector |
| undeclared mutation | 宣言成果物限定＋unrelated bytes比較 |
| invalid plugin false success | U10 loud reject＋三面不変 |
| cleanup漏れ | temp/tracked分離＋byte comparison |
| unsupported誤表示 | deferred一覧をguideへ明記 |

guide verificationでは、上記6必須面とdeferred一覧が各々一度以上明示され、no-clobberとrecord-owned dropがU10契約と一致し、local/temp手順がtracked source treeを変更しないことをtable-drivenに確認する。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U11-01〜05を中心に、`performance-requirements.md`のsingle E2E、`scalability-requirements.md`のclosed matrix、`reliability-requirements.md`のfailure invariants、`tech-stack-decisions.md`の既存U01/U09/U10、`business-logic-model.md`のGuide modelへ対応する。
