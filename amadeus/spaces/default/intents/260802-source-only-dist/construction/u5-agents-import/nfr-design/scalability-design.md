# Scalability Design — u5-agents-import

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一の`business-logic-model`をfallback入力とする。

## 拡張軸

指示文サイズに対してstreamingではなく単純byte比較でO(n)とする。現在の小規模文書にservice scalingは不要。新しいroot指示面を追加する場合は既存2面の配列へ暗黙追加せず、正本・投影・整合検査の所有を別設計で確定する。

## N/A

network、database、queue、load balancer、auto-scalingは存在しない。buildごとに状態を持たず、並行buildは各一時treeへ隔離する。
