# Reliability Design — u9-docs-norms

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 整合性

日英README、CONTRIBUTING、harness guides、release docs、AGENTS/.gitignore/.gitattributes契約をinventoryで追跡し、旧語彙残存をloud failにする(検査面は修正対象面に限定 — 記録面の散文引用は除外、BR-U9-6 準拠)。

## 復旧

誤記は通常PRの追加修正またはrevertで回復する。norm変更は別PRの人間承認を経るまでmemoryへ適用しない。
