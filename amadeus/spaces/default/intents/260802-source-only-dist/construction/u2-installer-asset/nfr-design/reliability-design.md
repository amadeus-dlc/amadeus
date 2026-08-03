# Reliability Design — u2-installer-asset

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 失敗契約

新版asset 404、checksum欠落/不一致、host逸脱、extract失敗はすべてcodeloadへfallbackせず非0。HTTPの一時失敗は既存retry policyの上限内だけretryし、検証失敗はretryしない。

## 原子性・復旧

download/extractは一時dirへ閉じ、checksumとlocate成功後だけtargetへtransactional installする。失敗時は一時dirをcleanupし既存installを保持する。旧版codeload経路はbyte不変。
