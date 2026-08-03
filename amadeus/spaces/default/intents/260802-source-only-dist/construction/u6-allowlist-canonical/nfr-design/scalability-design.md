# Scalability Design — u6-allowlist-canonical

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 拡張方針

entry追加は正本data1箇所で行い、preserved viewと期待集合を純関数導出する。件数や深さをハードコードせず、path segment数から深さ1、および深さ2(dispatcher — TrackedEntry.depth の 1|2 リテラル union に一致)の再包含を生成する。

## N/A

network、service、database、queue、auto-scalingはない。集合が数百件になってもbuild時有限処理であり、別基盤へ分割しない。
