# Scalability Design — u9-docs-norms

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 拡張

対象文書は固定一覧だけでなくdist/drift/promote/codeload語彙のrepo全域grepから導出する。新harness guide追加時も同じinventoryへ自然に入る。

## N/A

runtime service、database、queue、auto-scalingはない。
