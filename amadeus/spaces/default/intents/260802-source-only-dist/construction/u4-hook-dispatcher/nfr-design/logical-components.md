# Logical Components — u4-hook-dispatcher

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 | blast radius |
|---|---|---|
| `HookSlugTable` | 10 slug→固定path | 誤りは全11参照へ波及。全slug smokeで封鎖 |
| `HookPresenceProbe` | 実体の実在判定 | build前案内分岐だけ |
| `HookProcessForwarder` | Bun spawnとstdio/exit透過 | 共通forwarder障害は全11参照 |
| `SettingsHookBindings` | 11参照をdispatcherへ束ねる | Claude harness hook設定 |

## 共有資源と引き渡し

共有状態、database、network、AWS resourceはない。追跡dispatcherと生成hook実体のfile境界だけをInfrastructure Designへ渡し、追加基盤はN/Aとする。
