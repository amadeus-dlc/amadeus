# NFR Design 質問 — tla-invalid-timestamp-skeleton

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の判断を閉じる。

## Q1. retry identity

- A. local/CI transport retryは同一revision/attempt/run identityへ限定し、別runは新revisionにする
- B. attempt 3を追加する
- C. failure時に別fixtureへ切り替える
- X. その他

[Answer]: A — exactly 2 attemptsを維持する。（E-FVERA3R / E-FVEAD2）
**Basis:** `scalability-requirements.md` Cardinality model

## Q2. CI trust root

- A. trusted baseline workflow blob/ref/permissionsとCompositionHead checkoutを固定する
- B. conclusion=successだけを見る
- C. PR artifactも許す
- X. その他

[Answer]: A — bounded archiveとexactly 2 rowsも再検証する。（E-FVEAD3）
**Basis:** `security-requirements.md` Artifact verification

## Q3. failure stop

- A. terminal failure event後のledger suffixでfan-out command 0を証明する
- B. process memory flagだけで止める
- C. Arm Sを先行開始する
- X. その他

[Answer]: A — pass/fail二重commitを禁止する。（E-FVEUG2）
**Basis:** `reliability-requirements.md` State commit and failure

