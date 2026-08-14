# Unit of Work — 260814-plugins-rename-drift

上流入力: `application-design/components.md`(C1〜C6 と規模見積り表)、`component-methods.md`(公開契約)、`services.md`(ランタイムフロー F1〜F3)、`component-dependency.md`(依存マトリクス)、`decisions.md`(ADR-1〜6)、`requirements-analysis/requirements.md`(FR 群)。分割裁定は `units-generation-questions.md` Q1/Q2。stories.md は user-stories SKIP のため不在(expected)。

## U1: rename-github-pr-convergence

- **kind**: `packaging`(配布物・投影・消費者面の再編。実行時挙動の変更なし)
- **説明**: `plugins/pr-convergence/` → `plugins/github-pr-convergence/` の改名と全消費者同期(設計 C1 + C6 の scope-grid 検証)。Issue #2996 の全 FR-REN を実装。
- **境界(所有ファイル)**: `plugins/github-pr-convergence/`(移設後)、`amadeus/config.json`(activation.names 要素 + scope-bindings 外側キー)、`docs/harness-engineering/06-sensors.{md,ja.md}` の名前言及、テスト 20 件のパス文字列、`tests/.coverage-patch-allowlist.json` / `tests/.complexity-baseline.json` のパスピン、`tests/fixtures/pr-convergence/README.md`、`t445` の PLUGIN 定数、scope-grid 検証テスト(新規)
- **責務・成果**: FR-REN-1〜6 の受け入れ(残存参照 0 件・不変識別子の diff 機械確認・scope-grid 不変の実測)+ ADR-2 の落ちる実証
- **デプロイモデル**: monorepo 同時配布(dist 再生成で全ハーネスへ)
- **複雑度**: M(変更 ~450 行 + 検証テスト ~150 行 — components.md 規模表の C1)
- **制約**: TDD 既定(scope-grid 検証テストは Red 実測から)。歴史記録(intents/elections/codekb、project.md Learnings 引用)は不変。

## U2: plugin-settings-core

- **kind**: `library`(core ツール群への再利用可能機構の追加。単独ランタイムなし)
- **説明**: plugin.settings 設定機構の core 側 3 面 = 宣言パーサ(C2)+ config キー(C3)+ 解決・受け渡し(C4)。Issue #2997 の FR-SET を実装(env 宣言は ADR-3 で先送り確定)。
- **境界(所有ファイル)**: `packages/framework/core/tools/amadeus-plugin-compose.ts`(parseSettings 追加 + SCOPE コメント改訂)、`packages/framework/core/tools/amadeus-config.ts`(union / registry / parsePluginSettings / resolvedConfig)、`packages/framework/core/tools/amadeus-sensor.ts`(解決・argv 付与)、docs `21-layered-config` / `19-layered-config` en+ja、対応する unit/integration テスト
- **責務・成果**: FR-SET-1〜4 の受け入れ + 落ちる実証 4 項(不正値 fail-closed / 省略デフォルト / 実消費は U3 と結合して検証 / 綴り誤り loud)
- **デプロイモデル**: monorepo 同時配布
- **複雑度**: L(新規 ~400 行 + テスト ~650 行 — 規模表 C2+C3+C4)
- **制約**: 既存 3 プラグイン manifest の byte-identical 維持。t432 の docs 逐語一致。既存の未知キー検出の非退行。

## U3: git-drift-plugin

- **kind**: `service`(core から spawn される実行可能センサー CLI を含むプラグイン一式)
- **説明**: git-drift プラグイン新設(C5)+ 合成形状の conformance 検証(C6 の該当分)。Issue #2997 の FR-DRIFT を実装。
- **境界(所有ファイル)**: `plugins/git-drift/`(plugin.json / sensors/amadeus-git-drift.md / tools/amadeus-sensor-git-drift.ts)、`amadeus/config.json` の activation.names への `git-drift` 追加、stages:[]+sensors+seams 形状の conformance テスト(新規)、対応する unit/integration テスト
- **責務・成果**: FR-DRIFT-1〜6 の受け入れ + 落ちる実証 3 経路 + 非 git 不発火 + スロットル設定消費(FR-SET 落ちる実証 (iii) の実消費者側)
- **デプロイモデル**: opt-in 配布(ADR-4 — dist/plugins バンドル + activation.names)
- **複雑度**: L(新規 ~700 行 + テスト ~600 行 — 規模表 C5 + C6 の git-drift 分)
- **制約**: core import 禁止(ADR-6)。advisory severity 固定(ADR-5)。git 状態の変更は remote-tracking ref 更新(fetch)のみ。

## Construction 成果物適用性

全 Unit とも kind により functional-design / code-generation の標準成果物セットが適用される(ui 固有成果物なし)。U1 は挙動不変の packaging のため functional-design は消費者同期の写像表が中心、U2/U3 は公開契約(component-methods.md)の詳細化が中心。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:33:20Z
- **Iteration:** 1
- **Scope decision:** none

Unit境界はC1〜C6を漏れなく被覆、FR23件の割当も実測一致、YAML edge blockは整形・非循環・kind宣言済み、2.7/2.8責務分離も維持されておりBLOCKERなし。

### Findings

- FOLLOW-UP | U1のkind分類(packaging)がUnitの作業内容基準かプラグイン本質基準かの判断根拠が未記載。functional-design段での成果物セット選定に影響しうるため一言補足を推奨。
- FOLLOW-UP | amadeus/config.jsonはU1/U3の共有ファイルであり、相互排他キーである旨は記録済みだが編集順序・直列化の具体方針が未確定。2.8着手前に解消方針を明確化する必要がある。
- NIT | unit-of-work-dependency.mdの上流入力列挙にstories.mdへの明示言及がない(unit-of-work.md側では言及済み)。
