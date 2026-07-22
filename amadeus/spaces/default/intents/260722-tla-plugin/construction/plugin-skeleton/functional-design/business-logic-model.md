# Business Logic Model — U2 plugin-skeleton

上流入力(consumes 全数): unit-of-work(U2 定義・完了条件)、unit-of-work-story-map(体験ステップ4)、requirements(FR-1.1〜1.4、FR-2.1〜2.4)、components(C-1/C-8)、component-methods(C-1/C-8)、services(compose 実行単位)

## 中核フロー A: plugin ステージの engine 配線(C-1 walk 拡張)

1. `discoverPluginStageFiles(hostRoot)` — ホストの `plugins/*/stages/*.md` を列挙(plugins/ 不在・空 = 空配列で 0-plugin baseline)。読取不能は loud throw。**hostRoot の一致規約(Critical 是正 2026-07-22)**: 走査 root は compose が書き込むハーネスルート(= `stagesDir()` の2階層上、.claude 相当)と同一。plugin.json の stages path は `plugins/<name>/stages/<slug>.md` のホストツリー相対形で宣言し(compose は path を verbatim に hostRoot 直下へ書く — plugin-composition.ts:824 実測)、着地先と走査対象を一致させる
2. `compileStageGraph()` — 既存 walk(amadeus-common/stages/<phase>/*.md)の後に plugin ステージを合流。slug 重複(コア間・plugin 間・コア×plugin)は `plugin stage slug collides` で loud reject(inspectPlugin の same-name-stage と二重防衛)
3. 採番: 新 slug は既存の auto-seed 契約(number/name の computed-not-authored)を踏襲。scope-grid への影響なし(plugin ステージは scopes: [] — stock scope に属さない)
4. drop 後: plugins/ から該当ファイルが消え、再 compile で graph から除去。compile 出力(stage-graph.json / scope-grid.json)は 0-plugin 時と byte-identical(FR-1.3 — テストで固定)

## 中核フロー B: formal-model-check プラグイン(C-8)

1. オーサリング: `plugins/formal-model-check/` に plugin.json(stages 貢献のみ、seams なし)+ stages/formal-model-check.md + README(opt-in 依存の適用面別明文化 — ローカル JDK+sandbox-exec / CI Docker digest固定)
2. compose: 既存 plugin-composition エンジン(無改変)で inspect→apply。ステージファイルがホスト `plugins/formal-model-check/stages/formal-model-check.md`(manifest path の verbatim 着地)へ配置
3. doctor: `diagnosePlugins`(plugin-composition.ts:905 — 既存)で composed 状態を read-only 診断し、`composed` を確認(FR-2.1 の doctor 面 — Major 2 是正で明示化)
4. 実行: `next --stage formal-model-check --single` — ステージ本体は run-model-check CLI(U3)を実行し結果(exit code / out ディレクトリ)を報告。scripts/ 不在は loud エラー(ADR-7 — self-hosted 前提)
5. sensors 宣言: ステージ frontmatter に `sensors: [model-completeness]`(U5 のコア sensor を参照 — compile の unknown id 検証を通るのは U5 着地後。Bolt 順序で保証)
6. drop: applyPluginDrop でファイル除去→doctor で除去確認→再 compile で baseline 復帰

## E2E 受け入れ経路(FR-1.4 = walking skeleton 相当の実証)

compose → 実 compileStageGraph → 実 `amadeus-orchestrate next --stage formal-model-check --single` → ステージ実行 → drop → 再 compile baseline 一致。t254 の verify スタブでは代替しない(実 compile+実 orchestrate)

## エラー経路

- slug 衝突 / 読取不能 / scripts 不在: すべて loud(compile エラー or ステージ実行エラー)。graceful degrade・無言 skip なし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T14:09:53Z
- **Iteration:** 2
- **Scope decision:** none

Critical(path規約統一 plugins/<name>/stages/ + hostRoot一致)・Major2(doctor 2箇所組込)・Major3(pluginName撤回)の3閉包を実コード照合で確認。非ブロッキング注記1件(t254はflat path例示)のみ。

### Findings

- None
