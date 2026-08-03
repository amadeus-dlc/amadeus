# Reliability Design — u8-source-only-switch

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 原子切替

guard実装→ignore反転/追跡除外→旧check撤去/新意味適用→falling proof/revertを単一PRで行い、中間状態をmainへ出さない。各手順後にtracked inventoryを保存して次手順の前提を検証する。

## 復旧

失敗時は通常git revertでPR全体を戻す。履歴rewrite、生成物だけの再commit、branch protection緩和をしない。
