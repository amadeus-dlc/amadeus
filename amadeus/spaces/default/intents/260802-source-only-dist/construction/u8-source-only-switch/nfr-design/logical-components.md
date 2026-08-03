# Logical Components — u8-source-only-switch

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 |
|---|---|
| `GeneratedPathPolicy` | u6正本由来pattern |
| `TrackedBoundaryGuard` | ls-files交差0件 |
| `GraphInvariantGuard` | compile意味検査 |
| `SelfInstallFreshness` | local生成面の鮮度 |
| `CiChangeDetector` | source-only変更分類 |

## 引き渡し

共有境界はGit index、working tree、package build。追加cloud resourceはN/A。
