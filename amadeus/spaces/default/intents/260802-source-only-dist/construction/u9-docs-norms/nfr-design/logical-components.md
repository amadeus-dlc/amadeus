# Logical Components — u9-docs-norms

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 |
|---|---|
| `DocumentationInventory` | 対象語彙から文書面導出 |
| `BilingualContract` | README日英同期 |
| `OnboardingContract` | clone→install→build→start |
| `NormDraftSet` | memory改訂4点の文案 |
| `LegacyWordingGuard` | 旧契約残存0件 |

## 引き渡し

文書とGitHub PR以外のinfrastructureはN/A。norm mergeはoperation外の人間承認境界へ渡す。
