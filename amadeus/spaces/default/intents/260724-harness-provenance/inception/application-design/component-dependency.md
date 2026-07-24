# Component Dependency — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, architecture.md, component-inventory.md, team-practices.md

## 依存関係図

```
handleIntentBirthStateBuild()          [amadeus-utility.ts:3926]
        |
        | (同期呼出、intent birth 時)
        v
detectHarnessType()                    [amadeus-lib.ts 新設]
        |
        +--> process.env.AMADEUS_HARNESS_TYPE (FR-1 AC-1d、manual override、最優先)
        +--> process.env.CLAUDECODE    (FR-2)
        +--> harnessDir()              [amadeus-lib.ts:187-193 既存 export ラッパー]
        |         |
        |         +--> process.env.AMADEUS_HARNESS_DIR (FR-3 AC-3b、:189-190)
        |         +--> deriveHarnessDir() [amadeus-lib.ts:168-183 内部、env override 非対応]
        |                   |
        |                   +--> KNOWN_HARNESS_DIRS [amadeus-lib.ts:158 既存]
        +--> HARNESS_DIR_TO_TYPE       [amadeus-lib.ts 新設、KNOWN_HARNESS_DIRS と 1:1]

[書込] handleIntentBirthStateBuild() が stateContent テンプレートへ直接埋込
        (getField/setOrInsertField は将来の後付け更新用に存在、birth 時は不要)
```

## 依存方向の健全性

- `amadeus-utility.ts` → `amadeus-lib.ts` の依存は既存(architecture.md/component-inventory.md で確認済み、`amadeus-utility.ts` は多数の `amadeus-lib` ヘルパーを import 済み)。新規の循環依存を作らない(inception phase guardrail: 循環依存禁止)
- `detectHarnessType()` は `harnessDir()`(既存 export ラッパー、内部で `deriveHarnessDir()` へ委譲)にのみ依存し、新規外部依存を導入しない(team-practices.md: Bun-only 前提を変えない)

## 循環依存チェック

新規の依存エッジは `handleIntentBirthStateBuild → detectHarnessType → harnessDir → deriveHarnessDir` の一方向のみ(いずれも `amadeus-lib.ts` 内、または `amadeus-utility.ts → amadeus-lib.ts` の既存方向)。`amadeus-lib.ts` は `amadeus-utility.ts` を import しないため循環は発生しない(RE の code-structure.md で確認可能な既存の層構造を維持)。
