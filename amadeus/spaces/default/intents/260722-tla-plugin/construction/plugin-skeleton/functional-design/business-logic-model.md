# Business Logic Model — U2 plugin-skeleton

上流入力(consumes 全数): unit-of-work(U2 定義・完了条件)、unit-of-work-story-map(体験ステップ4)、requirements(FR-1.1〜1.4、FR-2.1〜2.4)、components(C-1/C-8)、component-methods(C-1/C-8)、services(compose 実行単位)

## 中核フロー A: plugin ステージの engine 配線(C-1 walk 拡張)

1. `discoverPluginStageFiles(hostRoot)` — compose後のホスト `plugins/*/stages/*.md` を列挙(plugins/ 不在・空 = 空配列で 0-plugin baseline)。読取不能は loud throw。走査rootはcompose先ハーネスルート(= `stagesDir()` の2階層上、.claude相当)と同一。
2. **path二面契約(2026-07-25 recovery)** — authoring / neutral bundleの`plugin.json`はplugin-root相対`stages/<slug>.md`だけを宣言する。composeはplugin名を一度だけprefixし、ホスト相対`plugins/<name>/stages/<slug>.md`へ着地させる。source pathをverbatim hostRoot直下へ書かず、manifestへ`plugins/<name>/`を重ねない。
3. `compileStageGraph()` — compose transactionがstage bodyをschema検証してfrontmatter/content digest/trust grantをmetadata indexへ保存する。compileは検証済みindexをidentity cache経由で合流し、aggregate digest、grant、path/slug一意性を再検証する。slug重複はloud reject。
4. `amadeus-orchestrate next --stage <slug> --single` — run-stage directive発行直前に、選択stage bodyをO_NOFOLLOW・祖先symlink拒否・dev/inode一致・通常ファイル・64MiB上限・同一fd SHA-256でtrust digestと照合する。compile後のbody driftも実行しない。
5. 採番: 新slugは既存auto-seed契約を踏襲。`scopes: []`はstock scope非所属のopt-inであり、compile統合時にstock scope-gridへ冗長なSKIPセルを生成しない。
6. drop後: ホストtargetとcomposition recordを同一transactionで除去してgrantを失効し、再compileで0-plugin baselineへbyte-identicalに戻す。crash recoveryはrecord preimageもjournalから復元する。

## 中核フロー B: formal-model-check プラグイン(C-8)

1. オーサリング: `plugins/formal-model-check/` に plugin.json(stages 貢献のみ、seams なし)+ stages/formal-model-check.md + README(opt-in 依存の適用面別明文化 — ローカル JDK+sandbox-exec / CI Docker digest固定)
2. compose: manifest source `stages/formal-model-check.md`を解決・検証し、ホストtarget `plugins/formal-model-check/stages/formal-model-check.md`へ配置する。同じtransactionでtrust grantとvalidated metadata indexを保存する
3. doctor: `diagnosePlugins`(plugin-composition.ts:905 — 既存)で composed 状態を read-only 診断し、`composed` を確認(FR-2.1 の doctor 面 — Major 2 是正で明示化)
4. 実行: `next --stage formal-model-check --single` — ステージ本体は run-model-check CLI(U3)を実行し結果(exit code / out ディレクトリ)を報告。scripts/ 不在は loud エラー(ADR-7 — self-hosted 前提)
5. sensors 宣言: ステージ frontmatter に `sensors: [model-completeness]`(U5 のコア sensor を参照 — compile の unknown id 検証を通るのは U5 着地後。Bolt 順序で保証)
6. drop: applyPluginDrop でファイル除去→doctor で除去確認→再 compile で baseline 復帰

## E2E 受け入れ経路(FR-1.4 = walking skeleton 相当の実証)

compose → 実 compileStageGraph → 実 `amadeus-orchestrate next --stage formal-model-check --single` → ステージ実行 → drop → 再 compile baseline 一致。t254 の verify スタブでは代替しない(実 compile+実 orchestrate)

## エラー経路

- slug衝突、未compose stage、index/grant改竄、body digest drift、symlink/通常ファイル違反、読取不能、scripts不在はすべてloud failure。graceful degrade・無言skipなし。

## 変更境界 — 2026-07-25 Option 1

旧BR-U2-7の`amadeus-graph.ts`限定境界は、ユーザー裁定Option 1によりforward-fixに限って置換された。authoritative変更面は`amadeus-graph.ts`、`plugin-composition.ts`、`amadeus-orchestrate.ts`、packaging、日英docs、tests、intent recordである。`plugin-projection.ts`を含むその他のコア面は対象外で、全生成物同期と品質ゲートを必須とする。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T14:09:53Z
- **Iteration:** 2
- **Scope decision:** none

Critical(path規約統一 plugins/<name>/stages/ + hostRoot一致)・Major2(doctor 2箇所組込)・Major3(pluginName撤回)の3閉包を実コード照合で確認。非ブロッキング注記1件(t254はflat path例示)のみ。

### Findings

- None
