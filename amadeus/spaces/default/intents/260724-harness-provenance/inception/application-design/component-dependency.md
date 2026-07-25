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
        +--> resolveHarnessDir()       [amadeus-lib.ts 内部、provenance付き]
        |         |
        |         +--> process.env.AMADEUS_HARNESS_DIR (FR-3 AC-3b、:189-190)
        |         +--> script-path / CWD probe / fallback
        |                   |
        |                   +--> KNOWN_HARNESS_DIRS [amadeus-lib.ts:158 既存]
        |                   +--> source=fallback の場合は unknown (FR-3 AC-3c)
        +--> HARNESS_DIR_TO_TYPE       [amadeus-lib.ts 新設、Issue #1452のcanonicalな5対応]

harnessDir()                           [既存公開API、string]
        |
        +--> resolveHarnessDir().dir   [公開契約・env優先・cache意味論を維持]

[書込] handleIntentBirthStateBuild() が stateContent テンプレートへ直接埋込
        (getField/setOrInsertField は将来の後付け更新用に存在、birth 時は不要)
```

## 依存方向の健全性

- `amadeus-utility.ts` → `amadeus-lib.ts` の依存は既存(architecture.md/component-inventory.md で確認済み、`amadeus-utility.ts` は多数の `amadeus-lib` ヘルパーを import 済み)。新規の循環依存を作らない(inception phase guardrail: 循環依存禁止)
- `detectHarnessType()` と既存`harnessDir()`は同じ内部`resolveHarnessDir()`に依存し、文字列解決とtype検出が同じladderを共有する。新規外部依存は導入しない(team-practices.md: Bun-only 前提を変えない)
- `KNOWN_HARNESS_DIRS`はCWD probeの候補順、`HARNESS_DIR_TO_TYPE`は記録対象のcanonical mappingという別責務を持つ。後者のkeyから`SupportedHarnessDir`を導出し、未知dot-dirは`unknown`へ閉じるため、手書きの重複型集合を作らない

## AC-3dの実行経路

`birthPrintDirective()` → `<harnessDir>/tools/amadeus-utility.ts` → 同階層`./amadeus-lib.ts`という配布時依存を、全6 harness manifestの`coreDirs: tools → tools`投影が保証する。明示`AMADEUS_HARNESS_DIR`があれば`env`、なければ`amadeus-lib.ts`のgrandparent dot-dirによる`script-path`でCWD probeより前に確定する。このため通常のintent birth依存グラフにCWD probeエッジは現れない。CWD probeは配布ツリー外からcore sourceを直接実行する開発時経路だけに残る。

## 循環依存チェック

新規の依存エッジは `handleIntentBirthStateBuild → detectHarnessType → resolveHarnessDir` の一方向のみ。既存`harnessDir → resolveHarnessDir`も同じ`amadeus-lib.ts`内に閉じる。`amadeus-lib.ts` は `amadeus-utility.ts` を import しないため循環は発生しない(RE の code-structure.md で確認可能な既存の層構造を維持)。
