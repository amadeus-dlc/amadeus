# Security Design — u8-source-only-switch

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 追跡境界

生成対象patternとallowlistはu6正本から導出し、空集合時にunscoped `git` 操作へ拡張しない。`git rm --cached`対象はdry inventoryと完全一致する明示pathspecだけに限定する。

## fail-closed

生成物追跡、未知sensor、grid差、bolt_dag parse失敗、self-install陳腐化は全て非0。ignore規則でcredentialを再包含しないnegative fixtureを置く。
