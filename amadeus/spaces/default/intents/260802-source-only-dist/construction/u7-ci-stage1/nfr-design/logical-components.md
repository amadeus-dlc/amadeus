# Logical Components — u7-ci-stage1

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 |
|---|---|
| `BuildScript` | dist+self-install単一入口 |
| `DistPresenceGuard` | run-tests前提検査 |
| `CiBuildPrestep` | test job順序契約 |
| `ReproducibilityJob` | A/B byte比較 |

## 引き渡し

u8は旧check撤去だけを行い、本Unitの再現性jobを変更しない。追加infrastructureはN/A。
