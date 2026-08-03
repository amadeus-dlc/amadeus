# Scalability Design — u8-source-only-switch

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 拡張

harness/生成面追加時はpackage discoveryとu6期待集合から自動反映し、境界guardに独立列挙を作らない。tracked file数に比例する有限CLI処理を維持する。

## N/A

service、database、queue、auto-scalingはない。CI runner既存資源内で実行する。
