# NFR Design 質問 — five-harness-intent-completion

## 裁定結果

追加のユーザー裁定は不要である。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、`functional-design/business-logic-model.md`のFR-HAR-001〜007 / 2067-AC22〜26契約をNFRオラクルとする。

## 確認

Q1. live実行をIntent完了の唯一条件にするか。

[Answer]: しない。必須cohort全件のcredential-attested live receiptがcanonical auditで検証済みの場合だけterminal transitionを許可し、credential不足のskipは完了証拠へ昇格させない。

Q2. 将来のharness追加でCore algorithmを変更するか。

[Answer]: しない。registry row、native adapter、生成型 / distributionの更新に限定し、cohort evaluatorとterminal transactionはharness名や件数を分岐へ埋め込まない。

## Reviewer上限到達後の裁定

[Answer]: commit receiptでbindしたcanonical run stateとbranded dispatch permitを公開契約へ追加し、新しいreview cycleで確認する。
