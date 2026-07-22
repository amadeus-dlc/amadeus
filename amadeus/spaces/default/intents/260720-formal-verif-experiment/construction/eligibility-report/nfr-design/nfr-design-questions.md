# NFR Design 質問 — eligibility-report

本質問は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` の判断を閉じる。

## Q1. worker/publisher分離

- A. sandboxed workerがverified stagingを作り、privileged publisherだけがfinal renameする
- B. rendererへfinal store権限を渡す
- C. publisherが再評価する
- X. その他

[Answer]: A — evaluation purityとpublish権限を分離する。（E-FVEAD3）
**Basis:** `security-requirements.md` Evidence and trace integrity

## Q2. deadline

- A. total390秒、worker各120秒、publish30秒へremaining budgetを渡す
- B. phaseごとにtimerをresetする
- C. timeout後partialをpublishする
- X. その他

[Answer]: A — timeout時はquarantineしpublishしない。（E-FVERA2R）
**Basis:** `performance-requirements.md` Evaluation bounds

## Q3. final root

- A. closed handlersをexactly one injectするwiring-only root
- B. rootでParetoを再計算する
- C. dynamic pluginを使う
- X. その他

[Answer]: A —既知FD findingを履歴に保持する。（E-FVEUG2）
**Basis:** `reliability-requirements.md` Wiring and unresolved history

