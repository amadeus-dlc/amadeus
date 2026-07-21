# Security Requirements — verification-and-ledger-closure

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。stale/partial/ambiguous evidenceによるfalse greenと不正ledger遷移を防ぐ。

## Integrity controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U12-01 | partial evidenceのEQUIVALENT化 | upstream contract全体のcharacterization evidence時だけEQUIVALENTを認める。 | partial EQUIVALENT 0。 |
| SEC-U12-02 | coverage欠落 | 24 item全てをtest/docs evidenceへtraceする。 | missing item 0。 |
| SEC-U12-03 | stale/false gate | typecheck/lint/dist/promote/full CI/coverageの未実施・非0・別SHAを拒否する。 | stale green 0。 |
| SEC-U12-04 | waiver濫用 | patch追加行未カバー0を必須とし、waiverは既決条件の明示証拠時だけ受理する。 | generic waiver 0。 |
| SEC-U12-05 | premature BLOCKED/APPLIED | closed unionの構造化evidenceと三条件だけを受理する。 | 進行中/曖昧自由文からのtransition 0。 |

新failure evidence language、disposition、waiver、判定順、transition variantを追加しない。U12は機能成果物を変更しない。

## Supply chain・compliance

FR23は採用contractだけを再著作し、SKIP testを持ち込まず、filesystem testをintegration-firstとする。FR24は英語正本/日本語pair、Amadeus path/namespace、6 harness、generated/hand-edit境界、legacy path 0を検査する。新runtime dependency、service、database、network、UI、credential、audit event、retentionを追加しない。

## トレーサビリティ

SEC-U12-01〜05は`business-rules.md`のBR-U12-01〜13、`business-logic-model.md`のCoverage/Verification/Ledger workflows、`requirements.md`のNFR-2/4/8、`technology-stack.md`に対応する。
