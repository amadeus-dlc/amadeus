# 依存関係

## 内部依存グラフ(既存 framework 配布経路、変更なし)

```mermaid
flowchart TD
  FWCore["packages/framework/core/"]
  FWHarness["packages/framework/harness/<name>/"]
  PackageScript["scripts/package.ts"]
  Promote["scripts/promote-self.ts"]
  Dist["root dist/<name>/"]
  Runtime["root .claude/.codex/.agents"]
  Tests["tests/"]
  CI[".github/workflows/ci.yml"]

  FWCore --> PackageScript
  FWHarness --> PackageScript
  PackageScript --> Dist
  Dist --> Promote
  Promote --> Runtime
  Dist --> Tests
  PackageScript --> Tests
  CI --> PackageScript
  CI --> Promote
```

<!-- text fallback: packages/framework/{core,harness} が scripts/package.ts に取り込まれ root dist/<name>/ を生成し、promote-self 経由で root .claude/.codex/.agents に反映される。CI がこの一連を実行する。この経路は本 intent で変更しない。 -->

## `@amadeus-dlc/setup` の内部依存(完成済み、#656 に関連)

```mermaid
flowchart TD
  Manifest["domain/manifest.ts"]
  ManifestIo["modules/manifest-io.ts"]
  Installation["domain/installation.ts (Installation.detect)"]
  Upgrade["domain/upgrade.ts (LegacyLayout)"]
  EngineLayout["domain/engine-layout.ts"]
  CLI["setup upgrade CLI"]

  Manifest --> ManifestIo
  ManifestIo --> Installation
  EngineLayout --> Installation
  Installation --> CLI
  Upgrade -.->|"設計上は接続されるべきだが未接続 #656"| Installation
```

<!-- text fallback: Installation.detect は ManifestIo と EngineLayout に依存して4分岐(none/manifested/manual-or-unknown/partial)を返すのみで、domain/upgrade.ts の LegacyLayout には依存していない。この欠落した依存が #656 の構造的原因である。 -->

## センサー複製の依存関係(#657 に関連)

```mermaid
flowchart LR
  CoreSensor["packages/framework/core/tools/amadeus-sensor-type-check.ts (正本)"]
  ClaudeCopy[".claude/tools/amadeus-sensor-type-check.ts"]
  DistCopy["dist/*/tools/amadeus-sensor-type-check.ts"]
  PackageTs["scripts/package.ts"]
  PromoteTs["scripts/promote-self.ts"]

  CoreSensor -->|promote:self| PromoteTs
  PromoteTs --> ClaudeCopy
  CoreSensor -->|package.ts| PackageTs
  PackageTs --> DistCopy
```

<!-- text fallback: 正本(core)の修正は scripts/package.ts と scripts/promote-self.ts の両方を経由しないと .claude コピーと dist コピーに反映されない。#657 の修理コミットはこの3ステップを同一コミットに含める必要がある。 -->

## hooks の cwd 依存関係(#641 に関連)

```mermaid
flowchart TD
  EnvVar["CLAUDE_PROJECT_DIR env"]
  ScriptPath["hook script path 逆算"]
  CwdProbe["cwd probe"]
  Cwd["cwd"]
  Resolve["resolveProjectDirFromHook()"]
  Engine["amadeus-orchestrate.ts (worktree cwd で実行)"]

  EnvVar --> Resolve
  ScriptPath --> Resolve
  CwdProbe --> Resolve
  Cwd --> Resolve
  Resolve -.->|"worktree では乖離しうる"| Engine
```

<!-- text fallback: resolveProjectDirFromHook() は4段フォールバックのいずれも worktree cwd を正として保証しないため、engine の実行 cwd と分岐しうる。 -->

## 外部依存関係

Framework 本体・`packages/setup` に新規の外部依存追加はない(前回 intent で完成した状態を維持)。CI が依存する外部要素も変更なし(`oven-sh/setup-bun@v2` 等)。

## Sibling intent 依存関係

前回 intent `260708-installer-distribution` は完了済み(commit 8510281ae 時点でマージ)。本 intent `260709-framework-repair-batch` はその成果物(`packages/setup` の完成)を前提として、無関係な4件のバグを修理する独立バッチである。4件は互いに独立したコード領域(setup CLI、センサー、hooks、ドキュメント)にあり、修理順序に依存関係はない。
