# Security Requirements — reference-plugin-and-guides

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。reference fixtureをuntrusted plugin入力として既存U01/U09/U10境界で検証し、host/sourceの無承認変更を防ぐ。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U11-01 | generated projectionの手編集 | `plugins/test-pro/`だけをauthoring正本とし、U09 projectionを使用する。 | generated treeの手編集0。 |
| SEC-U11-02 | undeclared host mutation | compose/doctor/dropで宣言成果物だけを生成・検出・除去する。 | unrelated host bytes差分0。 |
| SEC-U11-03 | malformed/conflicting pluginのfalse success | U10のsame-name/malformed/unknown seam loud rejectと三面不変を観測する。 | failureをsuccess/advisory化0。 |
| SEC-U11-04 | cleanup漏れ | success/failure双方でtemp rootとtracked treeを分離する。 | tracked一時物0。 |
| SEC-U11-05 | unsupported capabilityの誤表示 | deferred面をfixtureで宣言せず、guideで未対応と明示する。 | marketplace等の実装済み表現0。 |

新permission、credential、network送信、fixture ownership、cleanup/failure policyを追加しない。no-clobber、atomicity、record-owned dropはU10契約をそのまま消費する。

## Supply chain・compliance

upstream README/CHANGELOGをコピーせず、Amadeus path/namespaceへ再著作する。新runtime dependency、service、database、network、UI、audit event、retentionを追加せず、既存license/human gate/audit境界を維持する。

## トレーサビリティ

SEC-U11-01〜05は`business-rules.md`のBR-U11-01〜12、`business-logic-model.md`のEvidence/failure scenarios、`requirements.md`のNFR-2/4/8、`technology-stack.md`に対応する。
