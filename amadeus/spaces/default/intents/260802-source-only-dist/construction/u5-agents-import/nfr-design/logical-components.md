# Logical Components — u5-agents-import

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一の`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 | 障害領域 |
|---|---|---|
| `CodexSuffixEmitter` | dist/codex AGENTS suffix→未追跡import先 | Codex指示投影 |
| `AgentsImportGuard` | root AGENTS import2行のexact検査 | root Codex設定 |
| `ProjectInstructionsSource` | harness/claude data正本 | Claude指示正本 |
| `ClaudeCompositionGuard` | root CLAUDEのbyte整合 | root Claude設定 |
| `PromoteSelfOrchestrator` | 上記をbuild順序へ接続 | self-install build |

## 引き渡し

file I/Oだけで追加infrastructureはN/A。u6/u8と共有する`scripts/promote-self.ts`を統合境界としてInfrastructure Designへ渡す。
