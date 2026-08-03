# Logical Components — u6-allowlist-canonical

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 | 障害領域 |
|---|---|---|
| `SelfInstallAllowlist` | 3区分の単一正本 | path分類 |
| `PreservedView` | tracked∪preservedRuntime導出 | promote保存集合 |
| `GitignoreExpectation` | ignore/再包含期待の導出 | source-only境界 |
| `GitattributesExpectation` | 可視化例外期待の導出 | GitHub差分表示 |
| `AllowlistConsistencyTests` | 実file/期待の突合 | CI gate |

## 引き渡し

追加infrastructureはN/A。u8境界ガードが`GitignoreExpectation`を消費する契約を引き渡す。
