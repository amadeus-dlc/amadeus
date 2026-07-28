# Component Methods — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(FR 別契約)、architecture.md(既存シグネチャの実測)、component-inventory.md(既存コンポーネント境界)、team-practices.md(in-process seam 方針)

## C1: plugin CLI `install`(amadeus-plugin.ts)

| メソッド/変更点 | シグネチャ(案) | 契約 |
|---|---|---|
| `parseInstall(rest)` | `(rest: readonly string[]) => CliParseResult` | `install <path> [--force] [--project-root <dir>]`。path 欠落は usage-error(既存 parseDrop の name 欠落と同型) |
| `PluginCliCommand` 拡張 | `{ kind: "install"; sourcePath: string; force: boolean; projectRoot?: string }` を union へ追加 | 判別 union の機械拡張 |
| `handleInstall(cmd, deps)` | `(cmd, deps: PluginCliDeps) => PluginCliResult` | (1) source 検分(dir 実在・plugin 名 = basename) (2) 衝突判定: staging 同名の内容一致→続行 / 不一致→`failure`(stage: `"install"`)+`--force` 案内 / `--force`→置換 (3) コピー(一時領域→rename の原子形) (4) `handleCompose` 相当へ委譲 |
| `failure.stage` 拡張 | `"install"` を追加(5値→6値) | FR-1d。renderPluginCliResult の網羅 switch が型で強制 |
| 結果 kind | `{ kind: "installed"; name: string; composeOutcome: "composed" \| "noop" }` を追加 | FR-1e。exit 0、stdout に staging 先と compose 結果を報告 |
| `PluginCliDeps` 拡張 | `copyPluginSource(src, dst): void` と `stagingEntryState(dst, src): "absent" \| "identical" \| "different"` の2 seam | テストは fake FS でなく tmp dir 実 FS(integration 層 — fs-tests-integration-first) |

## C2: utility `plugin` case(amadeus-utility.ts)

| 変更点 | 内容 |
|---|---|
| `case "plugin":` | `handlePluginDelegate(rest)` — handleMigrate:5900-5929 と同型: `Bun.spawnSync(["bun", join(TOOLS_DIR,"amadeus-plugin.ts"), ...rest])`、stdout/stderr 透過、exit code 伝播。rest 無加工透過(FR-2c) |
| usage 同期 | default die(:6031-6034)へ `plugin` 追加+HELP_TEXT_TAIL(:216-252)へ `plugin <verb>` 行追加+t67 期待値更新(FR-2b の3面) |

## C4: runner-gen plugin 対応

| 変更点 | 内容 |
|---|---|
| plugin 識別 | GraphStage に plugin 識別子が無い(RE 実測)ため、**compile 時に GraphStage へ判別フィールドを焼く(ADR-1 確定主案)**。縮退先は composition record の `ownedPaths` 由来識別(ADR-1)— ノード path 由来判定は実行不能(path はノードに残らない)につき不採用 |
| `write` | plugin stage の runner も生成対象に含める(テンプレートは renderStageRunner 1定義) |
| `check` | 集合等価判定は維持(plugin runner が生成済みなら green)。repo(plugin 不在)では挙動不変(FR-4c) |
| prune | drop 後の再生成で plugin runner を除去(保護述語 `isRunnerSkill`:309-313 = `--stage`+`--single` 両マーカー判定、prune 本体 `pruneOrphanRunners`:342-356 — 保護規則は不変) |
| 起動配線 | plugin CLI の `handleCompose`/`handleDrop` の**両方**が spawnRecompile 成功後に `amadeus-runner-gen.ts write` を spawn(spawnRecompile と同型・同順)。compose 側 = plugin runner 生成、drop 側 = 再生成による prune で除去(FR-4a⇔4b の対称配線) |

## C3/C5: スキルと docs(メソッドなし — 文書面)

- C3: SKILL.md は mirror 様式の節構成。Canonical command contract 節に 5 verb の許容形を text fence で列挙。`--stage`/`--single` の2語を含めない(FR-3d)
- C5: installDoc の folder-drop-auto / manual-only クラスへ「または `bun <harness-dir>/tools/amadeus-plugin.ts install <path>` で1操作」を追記。19-plugins EN/JA の入口節を `/amadeus plugin <verb>` と `/amadeus-plugin` 起点へ書き換え

## テスト対応(C6)

| テスト | 層 | 対象 |
|---|---|---|
| t301 系拡張(install parse/handle 5ケース = FR-1f) | integration(実 FS tmp dir) | C1 |
| utility 委譲配線+exit 伝播(FR-2d) | unit(in-process、spawn は seam 注入) | C2 |
| runner-gen plugin fixture(compose 済みホスト模擬 — FR-4d) | integration | C4 |
| t341 系 E2E 拡張(install→compose→runner 実在→drop→残存なし) | e2e | C1+C4 縦断 |
