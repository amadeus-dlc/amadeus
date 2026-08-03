# Security Design — u7-ci-stage1

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 境界

build/testはcheckout済み固定SHAのrepository fileだけを入力にし、追加credential権限を付与しない。temp比較pathは`mkdtemp`配下へ閉じ、symlink escapeを拒否する。

## fail-closed

dist不在・空はrun-tests入口でexit 1。byte差は差分pathだけを出し、file内容やsecretをlogしない。
