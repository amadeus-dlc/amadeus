# Scalability Design — u7-ci-stage1

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 拡張

test job追加時はworkflow inventoryからbuild-before-test契約を導出する。job名の固定列挙だけに依存せず、dist-consuming commandを持つjobへ検査を適用する。

## N/A

service auto-scaling、queue、databaseはない。GitHub Actionsの既存parallel job上限を変えない。
