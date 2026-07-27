# Component Methods — plugin-host-delivery

> 上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices
> C1〜C6 の公開面(関数・verb・フック契約)。既存 engine の公開関数(codekb architecture.md / component-inventory.md 実測: scripts/plugin-composition.ts の export 群)は変更しない — 呼び出し側だけを定義する。functional-domain-modeling-ts(type+コンパニオン、判別 union Result)に従う。

## C1 `amadeus-plugin.ts`(CLI)

| verb | 引数 | 挙動 | exit |
|---|---|---|---|
| `compose` | `[--if-stale] [--project-root <dir>]` | discoverPlugins → inspectPlugin → planPluginComposition → applyPluginPlan(atomic)→ 再 compile 起動。`--if-stale` は composition record が最新なら**適用処理へ到達せず**早期 return(FR-3c-no-op の実測点) | 0 成功 / 1 失敗(fail-loud) |
| `doctor` | なし | diagnosePlugins の結果を行形式で表示([degraded]=FAIL / [advisory]=PASS(advisory)) | 0 / 1(degraded あり) |
| `drop` | `<plugin-name>` | planPluginDrop → applyPluginDrop → 再 compile。対象所有物のみ除去 | 0 / 1 |
| `status` | なし | composition record の要約(installed / composed / revision) | 0 |
| (引数なし) | — | usage 表示のみ(mutation しない — ADR-3) | 2 |
| (未知フラグ・余剰引数) | 例: `compose --help`、`drop a b` | **fail-closed 拒否** — mutation に到達せず usage を stderr へ表示(no-help-probe-on-mutating-verbs の緩和。未知引数の無視は禁止) | 2 |

- 内部関数は argv パラメータ化した `handlePluginCli(argv, deps): Promise<number>` を export(in-process テスト seam — seam-export-handler-amend 準拠、spawn 盲点回避)
- 失敗は typed Result で分類(discover 失敗 / trust 未 grant / plan 拒否 / apply 失敗+recovery 起動)し、すべて stderr へ 1 行 loud

## C2 移設後 engine(公開面は現状維持)

`amadeus-plugin-compose.ts` は現 `plugin-composition.ts` の export 群(SEAM_NAMES / discoverPlugins / parsePluginManifest / inspectPlugin / mergeSeamEntries / planPluginComposition / planPluginDrop / runRecovery / applyPluginPlan / applyPluginDrop / diagnosePlugins / createNodeBackend / createNodeLock / compositionToJson ほか)を**シグネチャ不変**で移設。ReadOnlyFs seam(plugin-projection.ts の nodeReadOnlyFs)は同居移設または core 側最小定義とし、二重定義しない。

## C3 projection(packaging)

- `projectPluginForHarness(plugin: ValidPlugin, harness: HarnessName, outDir: string): ProjectionResult` — per-harness 投影。ADR-5 の拒否集合(非投影 dir / FOREIGN / file / symlink / broken symlink)を plan 段で拒否
- `checkPluginProjections(): DriftReport` — `--check` 編入用。stale / orphan を列挙
- 生成物(ハーネス別、C9 マトリクスで確定するクラスに応じ選択):
  - claude: `.claude-plugin/plugin.json`+marketplace metadata+hooks snippet+`plugins/<name>/` 内容
  - folder-drop-auto クラス: `<harness-root>/plugins/<name>/` レイアウト+フック snippet+INSTALL 手順書
  - manual-only クラス: 同上(フック snippet なし・手動 compose 手順書)

## C4 フック契約(各ハーネス共通形)

```
on session-start:
  run: bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale
  失敗時: stderr へ 1 行警告のみ(セッション起動をブロックしない — fail-loud/continue)
```
- 各面の実装位置(実測済みフック面): claude = settings.json hooks(SessionStart)、codex/cursor/kimi/kiro/kiro-ide = 各 hooks/ アダプタ、opencode = plugin/amadeus-opencode-plugin.ts。配線可否は C9 マトリクスの実測が確定条件(未実測面へ ✅ を書かない)

## C5 doctor 行の契約

```
Plugins: <n> installed, <m> composed
  - <name> <version?> composed@<revision> [ok|drift|degraded|advisory: <detail>]
  - (activation) formal-model-check: spec-hash <match|CHANGED> (ADR-1)
```
degraded 行があれば doctor 全体の exit へ FAIL として伝播(既存 doctor 集約規約に従う)。

## C6 activation policy(ADR-1 案 A の実装面)

- `computeSpecHash(globs: readonly string[]): string`(決定的・ソート済みファイル列の内容ハッシュ)
- `readActivationState / writeActivationState`(最終 verdict 時 hash を composition record 隣接ファイルへ永続化 — gitignore 対象)
- engine 側: build-and-test 指令発行時に hash 差分があれば advisory 1 行(stdout directive を汚さない — stdout-directive-stderr-advisory 準拠で stderr へ)
- `--single` 要求撤廃: compose 済み plugin stage への明示 `--stage <slug>` を `--single` なしで single-stage 実行として受理する(engine 側)。中立正本 `plugins/formal-model-check/stages/formal-model-check.md` の condition 文も同時更新(U6 FD レビュー指摘の上流伝播 2026-07-27 — 詳細は U6 functional-design フロー 3 が正)
