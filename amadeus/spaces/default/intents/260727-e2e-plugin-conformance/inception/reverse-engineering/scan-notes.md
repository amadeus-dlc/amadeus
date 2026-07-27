# Reverse Engineering スキャンノート — 260727-e2e-plugin-conformance

## 0. 測定 ref と走査範囲

| 項目 | 値 | 取得コマンド |
| --- | --- | --- |
| Observed commit (HEAD) | `0c4709102cfa1d13e5aca6b49c65f31a903d72f2` (短縮 `0c4709102`) | `git rev-parse HEAD` |
| ブランチ | `worktree-plugin-dev` | `git branch --show-current` |
| Base commit | `1673c433209c74820881c75a0816bbce3fb2d512` | intent 指定 |
| 祖先性 | OK | `git merge-base --is-ancestor 1673c433... HEAD` → exit 0 (`ANCESTOR_OK`) |
| 区間コミット数 | 60 | `git rev-list --count 1673c433..HEAD` |
| 区間変更ファイル数 | 1830 | `git diff --name-only 1673c433..HEAD \| wc -l` |
| 区間 shortstat | `1830 files changed, 316726 insertions(+), 7366 deletions(-)` | `git diff --shortstat 1673c433..HEAD` |

本ノートに記載する file:line は全て observed commit `0c4709102` の断面。フルスキャンは行わず、差分区間 + 本 intent の対象面(plugin / doctor / drop / E2E / 配布面)に限定した。

以下、記載する全ての行番号・数値はコマンド出力または実ファイル読取からの転記であり、記憶からは書いていない。

---

## 1. 差分区間の面別内訳(コマンド出力転記)

`git diff --name-only 1673c433..HEAD | awk -F/ ... | sort | uniq -c | sort -rn` の出力(上位):

```
    639 amadeus/spaces/default   ← intent record(工程記録)
    301 dist/kimi                ← kimi ハーネス dist 新規着地
    296 .kimi-code               ← kimi self-install ツリー新規着地
     73 docs
     64 tests/integration
     48 tests/unit
     37 dist/plugins             ← plugin 中立バンドル + 7 面 install バンドル
     29 .claude
     27 .opencode
     26 .cursor
     26 .codex
     25 dist/opencode / dist/kiro-ide / dist/kiro / dist/codex / dist/claude(各25)
     24 packages/framework/core
     24 dist/cursor
     20 metrics
     17 packages/framework/harness
     13 tests/fixtures
      8 scripts
      6 packages/setup/src
      3 tests/smoke
      2 tests/e2e
      2 plugins
      1 tests/conformance
```

要点:
- 区間の大半は (a) record 639 (b) kimi ハーネス着地 (dist/kimi 301 + .kimi-code 296) (c) 全ハーネス dist 再生成。
- **plugin/E2E に関係する主要着地**(`git log --oneline 1673c433..HEAD` からの転記):
  - `f8fe817c5 feat(plugin): walking skeleton — engine relocation, plugin CLI, claude projection + auto-compose hook (Bolt 2, U2) (#1554)`
  - `a03944748 feat(plugin): AI-DLC v2.3.0 相当のプラグイン導入 UX を全7ハーネスへ追従(U3-U8: 全面投影・フック配線・doctor 観測・activation policy・適合スイート・docs) (#1568)`
  - `0e21b7c08 fix(plugin): 出荷 INSTALL.md のコピー先を CLI discovery ルート (.amadeus-plugin-src/) へ整合 (#1569) (#1579)`
  - `499a65488 fix(graph): skip dangling symlinks in plugin discovery enumeration (#1518)`
  - `1edf2abfb fix(tests): gate plugin discovery overhead on ratio AND absolute floor (#1535)`
  - `a45b01bd3 feat(harness): add Kimi Code CLI harness (kimi) (#1522)`(PACKAGE_HARNESSES 5→ kimi 追加の文脈)
- **tests/e2e/ の区間変更は 2 ファイルのみ**(`git diff --name-only 1673c433..HEAD -- tests/e2e/`):
  `tests/e2e/t-print-kimi-doctor.serial.test.ts`, `tests/e2e/t-print-kimi-status.serial.test.ts`。
  すなわち #1554/#1568 の plugin 二大着地は **e2e 層に一切テストを追加していない** — これが #1589 の一次事実。
- 区間で変更された `packages/framework/core/{tools,hooks}` と `scripts/` は 31 ファイル(コマンド: `git diff --name-only 1673c433..HEAD -- packages/framework/core/tools packages/framework/core/hooks scripts`)。うち plugin 面は `amadeus-plugin.ts` / `amadeus-plugin-compose.ts` / `amadeus-plugin-activation.ts` / `hooks/amadeus-plugin-compose.ts` / `amadeus-graph.ts` / `amadeus-orchestrate.ts` / `scripts/plugin-projection.ts` / `scripts/promote-self.ts` / `scripts/conformance-report.ts`。

---

## 2. plugin 面の現状(役割・エントリポイント)

`git ls-files | grep -i plugin`(dist/ と self-install ツリーと record を除外)からの実在確認に基づく。

### 2.1 正本モジュール(`packages/framework/core/tools/`)

| ファイル | 行数 | 役割 |
| --- | --- | --- |
| `amadeus-plugin.ts` | 613 | ハーネス中立 CLI(compose / doctor / drop / status)+ U5 doctor 投影 |
| `amadeus-plugin-compose.ts` | 1469 | C4 合成エンジン(plan/apply/drop/journal/backend/DropsRecord) |
| `amadeus-plugin-activation.ts` | 295 | U6 activation policy(spec-hash advisory、TLC は起動しない) |

行数取得: `wc -l amadeus-plugin.ts amadeus-plugin-compose.ts amadeus-plugin-activation.ts` → `613 / 1469 / 295 / 2377 total`。

### 2.2 CLI 動詞と結果型(`amadeus-plugin.ts`)

- `:8` verbatim: `// Verbs (C1): compose [--if-stale] [--project-root <dir>], doctor, drop <name>,`
- `:100` USAGE 行: `"  doctor  [--project-root <dir>]",`
- `:136` `function parseNoArgVerb(kind: "doctor" | "status", rest: string[]): CliParseResult`
- `:569-577` `runPluginCli` の dispatch(`:575` `if (cmd.kind === "doctor") return handleDoctor(cmd, deps);`)
- `:580-606` `renderPluginCliResult`(exit code と stdout/stderr のレンダリング)
- `:610-612` `handlePluginCli(argv, deps)` — in-process エントリ(coverage seam)
- `:613` `if (import.meta.main) process.exit(handlePluginCli(process.argv.slice(2)));`
- `:277` `export const PLUGIN_SOURCE_DIR_NAME = ".amadeus-plugin-src";` — discovery/staging ルート
- `:246-252` `defaultPluginCliDeps()`、`:245` `spawnRecompile` は `amadeus-runtime.ts compile` を `spawnSync("bun", [runtime, "compile"], { cwd: projectRoot, ... })` で起動(`:244-248`)

### 2.3 ホストスナップショット(drop/doctor が見る面)

`amadeus-plugin.ts:196-203` verbatim:

```
// Walk `hostRoot` into a HostSnapshot: every file (POSIX host-relative) becomes a
// path+bytes entry, and every serializeStageSeams-form file becomes a HostStage.
// The composed area `plugins/` IS included (so doctor/drop see owned files); the
// discovery/install staging area is a `.amadeus-plugin-` dot-dir (excluded by
// isEngineDotfile) so a freshly installed source is never seen as a clobber of
// its own owned landing path (the engine keeps discovery and host separate —
// t254). Engine dot-state is skipped.
```

`:204-223` `buildHostSnapshot` の walk は **ファイルのみ** を `paths`/`files` に入れる(`:210-213` でディレクトリは `walk(abs); continue;`)。ディレクトリはスナップショットの語彙に存在しない — #1586 の構造的背景。

### 2.4 graph 側 discovery

`packages/framework/core/tools/amadeus-graph.ts`:
- `:2011-2013` `export function discoverPluginStageFiles(hostRoot: string): PluginStageFile[] { return readPluginStageFiles(hostRoot).map((r) => r.file); }`
- `:2015-2023` `pluginsHostRoot()`。verbatim コメント: `/** The plugins host root for a compile: the harness root that also holds amadeus-common/stages, i.e. two levels up from stagesDir(). ... AMADEUS_PLUGINS_HOST_ROOT is a test seam ... */`

### 2.5 orchestrate の composition record 読取配線

`packages/framework/core/tools/amadeus-orchestrate.ts`:
- `:892-893` `const pluginStage = trustedPluginStageFile(slug); if (pluginStage !== null) return pluginStage;`
- `:913` `const recordPath = join(hostRoot, ".amadeus-plugin-composition.json");`
- `:924-926` trust 検証: `grant?.plugin !== plugin` / `|| !path.startsWith(\`plugins/${plugin}/stages/\`)`
- `:988` `export function pluginActivationHostRoot(): string`
- `:1017-1034` `emitComposedPluginStageIfInstalled` — **FR-7(a) の「`--single` なしで plugin stage へ到達」の実装**。verbatim(`:1017-1021`):
  ```
  // FR-7(a) — a compose-installed plugin stage is reachable via `--stage <slug>`
  // WITHOUT `--single`. When the requested stage is a composed plugin stage, emit
  // the isolated single run-stage and return true; otherwise return false so the
  // caller falls through to the normal jump path. Limited to compose-installed
  // plugin stages (BR-U6-5) — a stock stage is untouched.
  ```
- `:2289` 呼び出し点: `if (emitComposedPluginStageIfInstalled(flags, scope, projectType, recordPrefix, codekbCtx, pluginActivationHostRoot())) {`
- `:2815` `emitActivationAdvisory(...)`、`:3445` `recordActivationVerdictIfActivationStage(node.slug, pluginActivationHostRoot());`

### 2.6 SessionStart auto-compose hook

正本: `packages/framework/core/hooks/amadeus-plugin-compose.ts`(全 23 行、`wc -l` 実測)。全文の要点:

```
// SessionStart hook: auto-compose opted-in plugins into the host (C4 claude face,
// U2). A thin wrapper over the amadeus-plugin CLI — it re-implements NO
// composition logic (BR-U2-1). ...
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);
try {
  const code = handlePluginCli(["compose", "--if-stale", "--project-root", projectDir]);
  ...
process.exit(0);
```

配布面の登録(`dist/claude/.claude/settings.json.example:34-46` 実読):

```
    "SessionStart": [
      { "matcher": "", "hooks": [
          { "type": "command", "command": "bun \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-session-start.ts\"" },
          { "type": "command", "command": "bun \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-plugin-compose.ts\"" }
      ]}
```

→ **SessionStart auto-compose は「設定例に配線が書かれている」ことまでが出荷面の保証**であり、出荷 dist を導入したホストで実際に発火して compose→recompile まで到達することを検証する自動テストは存在しない(§5・§6 参照)。

---

## 3. #1575 — `PACKAGE_HARNESSES` の同名 export 値衝突

### 3.1 両定義の verbatim 引用

**`scripts/promote-self.ts:181-184`**:

```ts
// Harnesses whose dist trees feed the managedDirs self-install. Kept as data
// so --apply/--check freshness can be asserted in-process without spawning
// package.ts (bun --coverage cannot see spawned subprocesses).
export const PACKAGE_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"] as const;
```

**`scripts/plugin-projection.ts:39-57`**:

```ts
// The seven faces the packager discovers from harness/<name>/manifest.ts. Named
// here for the closed-matrix verification; the packager's own default target
// list stays manifest-DISCOVERED, not this constant.
export const PACKAGE_HARNESSES = [
  "claude",
  "codex",
  "cursor",
  "kiro",
  "kiro-ide",
  "opencode",
  "kimi",
] as const;
export type PackageHarness = (typeof PACKAGE_HARNESSES)[number];

// The self-install closed union: the five faces promote-self.ts reflects into
// the project root. Intentionally NOT the seven package faces — a type + runtime
// boundary that keeps kiro/kiro-ide out of the project-local install.
export const SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"] as const;
export type SelfInstallHarness = (typeof SELF_INSTALL_HARNESSES)[number];
```

### 3.2 欠陥所在の確定

- **値差の正体は「衝突する2つの真実」ではなく、`promote-self.ts` 側が誤った名前を使っていること**。`promote-self.ts:184` の 5 値集合は、`plugin-projection.ts:56` の `SELF_INSTALL_HARNESSES` と **値が完全一致**(`["claude","codex","cursor","opencode","kimi"]`)。
- `plugin-projection.ts:53-55` のコメントが verbatim で「the five faces promote-self.ts reflects into the project root. Intentionally NOT the seven package faces」と明言しており、**`SELF_INSTALL_HARNESSES` が 5 値集合の canonical**。
- したがって `promote-self.ts:184` は canonical-1定義違反(同名別意味の二重定義)であり、canonical は `plugin-projection.ts` 側の 2 定数。`promote-self.ts` は `SELF_INSTALL_HARNESSES` を import して使うか、少なくとも名前を `SELF_INSTALL_HARNESSES` に揃えるのが方向。
- **裏付け**: 消費側の1つが既に別名で受けている — `tests/integration/t-plugin-projection-packaging.test.ts:44` verbatim:
  `import { PACKAGE_HARNESSES as SELF_INSTALL_FACES } from "../../scripts/promote-self.ts";`
  同ファイル `:48` は 7 値を **ハードコード再定義**している: `const PACKAGE_HARNESSES_7 = ["claude", "codex", "cursor", "kiro", "kiro-ide", "opencode", "kimi"];`(3つ目の同義集合)。
  `:160-163` のテストは `SELF_INSTALL_FACES` が 5 値であることと 7 値集合への包含を assert するだけで、**同名 export の衝突自体を検出するガードは存在しない**。

### 3.3 消費側の棚卸し(2キー grep — grep 出力からの転記)

コマンド: `grep -rn "PACKAGE_HARNESSES\|SELF_INSTALL_HARNESSES" scripts/ tests/ packages/ docs/`

キー1「`PACKAGE_HARNESSES`」— 定義2 + 参照 hit 一覧:

| file:line | どちらの定義を指すか |
| --- | --- |
| `scripts/plugin-projection.ts:42` | 定義(7) |
| `scripts/plugin-projection.ts:51` | 7、`PackageHarness` 型導出 |
| `scripts/plugin-projection.ts:798` | 7、`pluginBundleExpected` の per-harness install 面ループ |
| `scripts/plugin-projection.ts:822` | 7、`assertInstallOutDirsSafe` |
| `scripts/promote-self.ts:184` | 定義(5) |
| `scripts/promote-self.ts:187` | 5、`packageFreshnessArgs` |
| `tests/unit/t325-face-disposition.test.ts:16,38,51,52,59` | 7(plugin-projection から import) |
| `tests/unit/t306-plugin-host-class.test.ts:11,29,30,34,38` | 7(`import { PACKAGE_HARNESSES, PLUGIN_HOST_CLASS } from "../../scripts/plugin-projection.ts"`) |
| `tests/unit/t-plugin-projection.test.ts:29,306,307,308` | 7(`:308` `expect(PACKAGE_HARNESSES).toHaveLength(7)`) |
| `tests/unit/t209-promote-self-dangling-symlink.test.ts:44,151,152` | **5**(promote-self から import。`:152` `expect([...PACKAGE_HARNESSES]).toEqual(["claude","codex","cursor","opencode","kimi"])`) |
| `tests/integration/t308-project-all-harnesses.integration.test.ts:15,40` | 7 |
| `tests/integration/t254-reference-plugin-lifecycle.test.ts:56,189,190,236` | 7(`:189` `expect([...PACKAGE_HARNESSES]).toHaveLength(7)`) |
| `tests/integration/t327-hook-wiring-xor-closure.integration.test.ts:25,63` | 7 |
| `tests/integration/t-plugin-projection-packaging.test.ts:44,162` | **5**(別名 `SELF_INSTALL_FACES` で import) |

キー2「`SELF_INSTALL_HARNESSES`」:

| file:line | 用途 |
| --- | --- |
| `scripts/plugin-projection.ts:56` | 定義(5) |
| `scripts/plugin-projection.ts:57` | `SelfInstallHarness` 型 |
| `scripts/plugin-projection.ts:863` | `return (SELF_INSTALL_HARNESSES as readonly string[]).includes(name);` |
| `tests/unit/t-plugin-projection.test.ts:36,306,307` | 5 |
| `tests/integration/t254-reference-plugin-lifecycle.test.ts:58,237` | 5 |

キー2の展開後リテラル(`"kiro-ide"` を含まない 5 値配列)としては、`tests/integration/t-plugin-projection-packaging.test.ts:161` の `expect([...SELF_INSTALL_FACES].sort()).toEqual(["claude","codex","cursor","kimi","opencode"])` と `tests/unit/t209-promote-self-dangling-symlink.test.ts:152` が該当。**この2箇所が改名時の同期対象**。

参考: `scripts/promote-self.ts:47-54` の `managedDirs` も同じ 5 面を独立に列挙している(`dist/claude/.claude` … `dist/kimi/.kimi-code`、`.agents` を含めて 6 エントリ)。3 つ目の同義列挙であり、統合検討の候補。

---

## 4. #1585 — standalone doctor が 0-plugin ホストで無出力

### 4.1 決定的再現(実行コマンドと出力)

```
$ mkdir -p <scratch>/emptyhost
$ bun packages/framework/core/tools/amadeus-plugin.ts doctor --project-root <scratch>/emptyhost > doctor.out 2> doctor.err
exit=0
--stdout bytes--
0
--stderr--
(空)
```

→ **exit 0 / stdout 0 バイト / stderr 空**。

### 4.2 非対称の機序(2経路の file:line 対照)

**standalone 経路**(無出力):
- `amadeus-plugin.ts:393-405` `handleDoctor` — `deps.diagnosePlugins(host, journalPending).map(...)` で `lines` を作り `{ kind: "doctor", lines, degraded }` を返す。0-plugin では `lines` が空配列。
- `amadeus-plugin.ts:591-593` `renderPluginCliResult` の `case "doctor"` verbatim:
  ```ts
      case "doctor":
        for (const l of result.lines) deps.out(`  - ${l.plugin} [${l.state}]${l.detail ? `: ${l.detail}` : ""}`);
        return result.degraded ? 1 : 0;
  ```
  空配列 → ループ 0 回 → 出力なし、exit 0。

**統合 doctor 経路**(0件行あり):
- `amadeus-plugin.ts:531-546` `doctorPluginRows`。`:534-537` verbatim:
  ```ts
  export function doctorPluginRows(section: DoctorPluginSection): readonly DoctorPluginRow[] {
    if (section.lines.length === 0) {
      return [{ pass: true, label: "Plugins: 0 installed" }];
    }
  ```
  直上の設計コメント `:531-533`: `// Pure render: section → doctor rows for the --doctor report. A 0-plugin host` / `// (no diagnostics and no drops) degrades to a single passing line (BR-U5-4), so` / `// the plugin section adds exactly one row and never flips a healthy exit.`
- `packages/framework/core/tools/amadeus-utility.ts:2884-2892` が消費側。`:2887` verbatim: `// single passing "Plugins: 0 installed" row (BR-U5-4); [degraded]/[recovery-`、`:2890` `for (const row of doctorPluginRows(buildDoctorPluginSection(pluginObservation))) {`

**確定**: 非対称の所在は `amadeus-plugin.ts:591-593`。standalone doctor は `handleDoctor` の生 `lines` を直接レンダリングし、**0件 degrade を実装している純関数 `doctorPluginRows`(:534-536)を一切通っていない**。BR-U5-4 は統合面にだけ適用され、standalone 面に写っていない(write⇔read の非対称ではなく「同一契約の2つのレンダラ」の非対称 = `cid:code-generation:c1-drift-canonical-renderer` と同族)。

なお `status` 動詞は 0-plugin でも出力する(`:594-596` `deps.out(\`Plugins: ${result.installed} installed, ...\`)`) — doctor だけが黙る。

### 4.3 既存テストが検出しない理由

- `tests/unit/t314-doctor-plugin-rows.test.ts:36-38` は `doctorPluginRows`(純関数)に対して 0件行を assert しており **standalone レンダラを通らない**。
- `tests/integration/t315-doctor-plugin-observability.integration.test.ts:113` / `:204` も同様に統合面・純関数面のみ。
- `tests/integration/t299-...:233-238` の doctor テストは **1 plugin composed 済みの状態**で `${PLUGIN} [ok]` を assert するだけで、0-plugin ケースを踏まない。

---

## 5. #1586 — drop 後の `plugins/<name>/stages/` 空ディレクトリ残存

### 5.1 決定的再現(実行コマンドと出力)

```
$ H=<scratch>/h1586b; mkdir -p "$H/.amadeus-plugin-src"
$ cp -R plugins/formal-model-check "$H/.amadeus-plugin-src/formal-model-check"
$ bun packages/framework/core/tools/amadeus-plugin.ts compose --project-root "$H"
composed 1 plugin(s), recompiled
compose_exit=0
$ find "$H" -path '*/.amadeus-plugin-src' -prune -o -print | sort
  .../h1586b
  .../h1586b/.amadeus-plugin-audit.json
  .../h1586b/.amadeus-plugin-composition.json
  .../h1586b/.amadeus-plugin-drops.json
  .../h1586b/plugins
  .../h1586b/plugins/formal-model-check
  .../h1586b/plugins/formal-model-check/stages
  .../h1586b/plugins/formal-model-check/stages/formal-model-check.md

$ bun packages/framework/core/tools/amadeus-plugin.ts drop formal-model-check --project-root "$H"
dropped formal-model-check (baseline restored), recompiled
drop_exit=0
$ find "$H" -path '*/.amadeus-plugin-src' -prune -o -print | sort
  .../h1586b
  .../h1586b/.amadeus-plugin-audit.json
  .../h1586b/.amadeus-plugin-composition.json
  .../h1586b/.amadeus-plugin-drops.json
  .../h1586b/plugins
  .../h1586b/plugins/formal-model-check
  .../h1586b/plugins/formal-model-check/stages     ← 残存
$ find "$H/plugins" -type d -empty
  .../h1586b/plugins/formal-model-check/stages
```

→ **`plugins/`, `plugins/<name>/`, `plugins/<name>/stages/` の 3 階層が空ディレクトリとして残る**。かつ CLI は `(baseline restored)` と宣言している(偽の成功宣言)。

補足観測: `.amadeus-plugin-drops.json` も drop 後に残る(`clearPluginDrops` は key を削って空 record を書き戻す — `amadeus-plugin-compose.ts:1230-1235`)。これはエンジン dot-state であり `isEngineDotfile`(`amadeus-plugin.ts:191-193`)で snapshot から除外される面だが、「導入前ゼロバイト面」の厳密復元を要件にするなら論点になりうる。

### 5.2 欠陥所在の確定(file:line)

**除去ロジック本体** — `packages/framework/core/tools/amadeus-plugin-compose.ts:1146-1156`(`createNodeBackend`)verbatim:

```ts
    readHost: (p) => (existsSync(abs(p)) ? readFileSync(abs(p)) : undefined),
    writeHost: (p, b) => {
      mkdirSync(dirname(abs(p)), { recursive: true });
      writeFileSync(abs(p), b);
    },
    removeHost: (p) => {
      if (existsSync(abs(p))) rmSync(abs(p));
    },
```

- `:1150` compose 側は `mkdirSync(dirname(abs(p)), { recursive: true })` で **親ディレクトリを再帰生成**する。
- `:1154-1155` drop 側は `rmSync(abs(p))` で **ファイルのみ削除**し、`:1150` が作った親ディレクトリを剪定しない。
- → `mkdir(recursive)` ⇔ `rm(file only)` の **非対称対**(`cid:requirements-analysis:symmetric-pair-review` クラス)。これが #1586 の一次所在。

**上位経路(剪定の機会がない理由)**:
- `amadeus-plugin-compose.ts:991-1000` `applyPluginDrop` → `dropWriteSet`(`:1040-1053`)が `hostRemovals: plan.removals` を返す。`plan.removals` は `planPluginDrop`(`:703-730`)が `record.ownedPaths`(= **ファイルパス**の集合)から作るもので、ディレクトリは語彙として存在しない。
- `amadeus-plugin.ts:204-223` `buildHostSnapshot` もディレクトリを `paths` に入れない(§2.3)。よって計画層・検証層のどこにもディレクトリの概念がない。

**`baselineRestored` が真を返す理由** — `amadeus-plugin.ts:377` verbatim:

```ts
  const baselineRestored = backend.readComposition().plugins.size === 0;
```

→ **composition record のみを根拠**にしており、ファイルシステム残渣を一切見ない。CLI が `(baseline restored)` と出す(`:589`)のはこの record 判定に基づく。

### 5.3 既存テストがなぜ検出しないか

| テスト | 該当行 | 盲点の機序 |
| --- | --- | --- |
| `tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts:166-176`(「drop restores the 0-plugin baseline (BR-U2-8)」) | `:171` `expect(existsSync(join(host, OWNED_STAGE))).toBe(false);` / `:173` `expect(hashSurface(host)).toBe(baseline);` | `hashSurface`(`:88-101`)が **ファイルのバイトのみ**をハッシュする。`:94-97` verbatim: `if (statSync(abs).isDirectory()) walk(abs); else { h.update(abs.slice(root.length)); h.update(readFileSync(abs)); }` — 空ディレクトリは走査しても何も update しないため、残渣の有無でハッシュが変わらない。**構造的に検出不能**。 |
| `tests/integration/t254-reference-plugin-lifecycle.test.ts:286-288` | `:288` `expect(existsSync(ownedPath)).toBe(false);` | ファイル1点のみの assert。親ディレクトリを見ない。 |
| `tests/integration/t311-zero-plugin-byte-identical.integration.test.ts`(全 37 行) | `:33-35` `expect(checkPluginProjections(pluginsRoot, distRoot)).toEqual([]); expect(existsSync(join(distRoot, "plugins"))).toBe(false);` | **対象が違う**。t311 は `scripts/plugin-projection.ts` の **パッケージャ側(`dist/plugins/` 生成)** の 0-plugin baseline を検証するテストで(ヘッダ `:4-7`: "U3 host-projection-all — the 0-plugin byte-identical baseline (BR-U3-4 / REL-U3-1). With no plugin sources, pluginBundleExpected is EMPTY..."), **ホストへの compose/drop の baseline 復元は射程外**。 |
| `tests/integration/t254-...:357-369`(Part D — no residue in the tracked tree) | `:368-369` `expect(existsSync(join(REPO_ROOT, "plugins", PLUGIN))).toBe(false);` 等 | repo ツリーへの汚染を見るテストで、temp ホストの drop 後残渣は見ない。 |

つまり **`baselineRestored` の判定基準(record)と、テストの判定基準(ファイルのみ)が両方ともディレクトリを見ない**という二重の盲点。

---

## 6. 既存 plugin テストの層と盲点(#1589 の根拠)

### 6.1 plugin 系テストの一覧と層

`git ls-files tests/ | grep -c plugin` → **24**。層別(各ファイル冒頭の `size:` / ヘッダ実読):

**unit 層(純関数・in-process)**
| ファイル | size | 対象 |
| --- | --- | --- |
| `tests/unit/t252-plugin-composition.test.ts` | small | 合成エンジンの純関数 |
| `tests/unit/t300-plugin-cli-args.test.ts` | small | `parsePluginCliArgs`(純パーサ) |
| `tests/unit/t301-plugin-cli-seams.test.ts` | small | CLI の純 seam(`parseHostStageSeams` 等) |
| `tests/unit/t306-plugin-host-class.test.ts` | — | `PLUGIN_HOST_CLASS` × 7 面 |
| `tests/unit/t313-doctor-plugin-section.test.ts` | small | `buildDoctorPluginSection`(純投影) |
| `tests/unit/t314-doctor-plugin-rows.test.ts` | small | `doctorPluginRows` / `formatDoctorPluginLine`(純レンダ) |
| `tests/unit/t-plugin-projection.test.ts` | — | 投影の純関数 + 定数集合 |
| `tests/unit/plugin-discovery-overhead-gate.test.ts` | — | discovery オーバーヘッドゲート |

**integration 層(実 FS、in-process 駆動が主)**
| ファイル | 駆動形態 | 備考 |
| --- | --- | --- |
| `t253-plugin-composition-fs.test.ts` (medium) | in-process + 実 FS | エンジンの FS 証明 |
| `t254-reference-plugin-lifecycle.test.ts` | in-process(`applyPluginDrop` を直接呼ぶ、`:286`) | 投影 → compose → doctor → drop |
| `t299-plugin-cli-walking-skeleton.integration.test.ts` (medium) | **in-process(`handlePluginCli(argv, deps)`)+ recompile スタブ** | 後述 |
| `t302-plugin-cli-failure-branches.integration.test.ts` | in-process | 失敗分岐 |
| `t303-plugin-projection-harness.integration.test.ts` (medium) | in-process | `projectPluginForHarness` |
| `t308-project-all-harnesses.integration.test.ts` | in-process | 7 面投影 |
| `t310-check-plugin-projections.integration.test.ts` (medium) | in-process | `--check` seam |
| `t311-zero-plugin-byte-identical.integration.test.ts` | in-process | パッケージャ側 0-plugin baseline |
| `t315-doctor-plugin-observability.integration.test.ts` (medium) | in-process | 統合 doctor 面 |
| `t321-activation-engine-seams.integration.test.ts` | **in-process 明示** | ヘッダ `:4-11` 参照 |
| `t322-activation-lifecycle-behaviour.integration.test.ts` | 合成 graph 上の behaviour | |
| `t338-conformance-recompile-selfheal.integration.test.ts` (medium) | **in-process + recompile カウンタ** | ヘッダ参照 |
| `t-formal-verif-plugin-lifecycle.integration.test.ts` | **spawn した orchestrate** | 後述 |
| `t-formal-verif-plugin-stage-discovery.integration.test.ts` | in-process + 実 FS | graph join |
| `t-plugin-projection-packaging.test.ts` | in-process | パッケージング |
| `t-plugin-stage-discovery-performance.integration.test.ts` | — | 性能 |
| `t327-hook-wiring-xor-closure.integration.test.ts` | in-process | フック配線 XOR |

**e2e 層**: `ls tests/e2e/ | wc -l` → 83 ファイル、うち `*.serial.test.ts` は 35。**plugin を対象にした e2e は 0 件**(`git ls-files tests/ | grep plugin` の結果に `tests/e2e/` のエントリが一つも現れない)。

### 6.2 recompile スタブ / spawn 有無の実測

**`tests/integration/t299-...:1-13` ヘッダ verbatim(自認コメント)**:

```
// covers: file:packages/framework/core/tools/amadeus-plugin.ts, hook:amadeus-plugin-compose
// size: medium
//
// U2 walking-skeleton-claude — the CLI's end-to-end vertical slice driven
// IN-PROCESS through handlePluginCli(argv, deps) with an injected dependency bag
// (recompile stubbed, engine real). Touches a real temp filesystem, hence
// integration tier (fs-tests-integration-first). Proves: fail-closed parse
// rejects before any mutation (BR-U2-4), compose lands + is reflected in the
// compiled graph's plugin-stage discovery (FR-4), the no-op fast path never
// reaches applyPluginPlan (BR-U2-3 / performance-design), compose is idempotent
// (BR-U2-2), drop restores the baseline (BR-U2-8), and a verify failure leaves
// host + record byte-invariant (BR-U2-5). The real subprocess start (BR-U2-6) is
// in t299b below.
```

および `:52-54` verbatim: `// Real engine + real buildHostSnapshot; applyPluginPlan wrapped to count calls` / `// (the no-op fast-path assertion) and recompile stubbed (no runtime graph in a` / `// synthetic host). verifyOk toggles the atomic-rollback test.`

スタブ本体 `:75-78`:
```ts
    recompile: () => {
      recompileCount += 1;
      return true;
    },
```

**唯一の spawn**(`grep -rn "amadeus-plugin.ts" tests/ | grep -i "spawn\|join("` の唯一のヒット)— `t299-...:205-218` verbatim(抜粋):

```ts
  test("SessionStart command really starts and reaches compose (BR-U2-6, not verification theatre)", () => {
    const cli = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-plugin.ts");
    const res = spawnSync("bun", [cli, "compose", "--if-stale", "--project-root", host], { ... });
```

その直上の設計コメント `:198-204` verbatim:
```
  // BR-U2-6: the auto-compose path is verified by REALLY starting the CLI as the
  // SessionStart hook would (a spawned subprocess), not by checking a settings
  // wiring exists (verification theatre). We assert the real subprocess reached
  // and ran the engine — it wrote the composition record. (The post-apply
  // recompile spawns amadeus-runtime.ts compile against a synthetic host, which
  // has no runtime graph, so the process exits non-zero after committing — the
  // record write is the proof the compose entry actually ran.)
```

### 6.3 盲点の確定(#1589 の欠落面)

| #1589 が名指しする経路 | 現状のカバレッジ | 盲点 |
| --- | --- | --- |
| **出荷 dist 導入** | 無 — plugin テストは全て `packages/framework/core/tools/`(正本)を import/spawn する。`tests/` 内で `dist/claude/.claude/tools/amadeus-plugin.ts` を読む/spawn するテストは 0 件(§6.2 の grep 結果が唯一の spawn で、対象は正本パス) | **出荷面(dist)未検証**。`cid:code-generation:injection-surface-verify`(テストが読む面)の観点で、plugin CLI の出荷コピーは一度も駆動されていない |
| **SessionStart auto-compose** | `t299:205` が「SessionStart hook がやるであろうコマンド」を spawn するのみ。hook ファイル本体(`hooks/amadeus-plugin-compose.ts`)も `settings.json` 経由の実発火も駆動しない | **hook 実体と settings 配線の実発火が未検証**(コメント自身が "as the SessionStart hook would" = 模倣であることを明示) |
| **実 recompile** | t299 はスタブ(`:75-78`)。t299b の spawn は `// ... exits non-zero after committing` と自認(`:202-204`)。t338 は recompile カウンタ | **compose 後に runtime graph が実際に再生成され plugin stage が graph に載る、という end-to-end 効果が実ホストで未検証** |
| **通常 scope 実行での plugin stage 到達(`--single` なし)** | `emitComposedPluginStageIfInstalled`(`amadeus-orchestrate.ts:1022`)を参照するテストは `t-formal-verif-plugin-lifecycle` / `t321` / `t322` の 3 件のみ。うち `t-formal-verif-plugin-lifecycle` のヘッダ `:8` verbatim は `` `orchestrate next --stage formal-model-check --single` emits a run-stage `` = **`--single` 付き**。`t321` はヘッダ `:5` verbatim `driven IN-PROCESS so the added orchestrate lines register in lcov` で seam を直接呼ぶ | **出荷ホスト上で `--single` を付けずに plugin stage へ到達する経路の e2e 検証が無い**(seam 単体の in-process 呼び出しはある) |
| **doctor** | §4 のとおり standalone 0-plugin が未カバー、統合 doctor も純関数/in-process のみ | 出荷 CLI 経由の doctor 出力が未検証 |
| **drop → baseline 復元** | §5.3 のとおりファイル単位のみ。空ディレクトリ残渣を見ない | baseline 復元の「完全性」定義自体が不十分 |

---

## 7. tests/e2e/ の既存様式(#1589 実装時の準拠先)

### 7.1 命名規約と分類

- `ls tests/e2e/ | wc -l` → **83**、`ls tests/e2e/*.serial.test.ts | wc -l` → **35**。
- 命名の系統(実ファイル名から):
  - `t-tui-*.serial.test.ts` — レンダリング端末を駆動する TUI ジャーニー(例 `t-tui-t73-intent-capture.serial.test.ts`)
  - `t-exec-codex-*.serial.test.ts` — Codex CLI の exec 面
  - `t-print-kimi-*.serial.test.ts` — Kimi Code の headless print 面(`kimi -p`)
  - `t-acp-kiro-*.serial.test.ts` / `t-ide-kiro-*.serial.test.ts` — Kiro 系
  - `setup-install.test.ts` / `setup-upgrade.test.ts` / `setup-bin-shim.test.ts` — インストーラ E2E(非 serial)
  - `t-formal-verif-*.test.ts` — 形式検証系(非 serial)
- `.serial.` を名前に含むファイルは runner が直列扱いにする — `tests/run-tests.ts:888` verbatim: `const serial = pinnedSerial || basename(file).includes(".serial.");`

### 7.2 駆動機構(実測)

- **TUI 系**: node-pty / @xterm/headless(`project.md` の主要開発依存に記載。`tests/e2e/t-tui-preflight.serial.test.ts` が capability gate)。
- **print/exec 系(ハーネス CLI を実起動)**: `tests/e2e/t-print-kimi-doctor.serial.test.ts:1-37` ヘッダ verbatim(抜粋):
  ```
  // t-print-kimi-doctor.serial.test.ts — drive `/skill:amadeus --doctor`
  // through the Kimi Code CLI's headless surface (`kimi -p`) against the SHIPPED
  // dist/kimi tree, and assert on the kimi doctor arm's real rows (FR-9a,
  // journey 2). ...
  // HERMETICITY (BR-2): the project is a tmp copy of dist/kimi and
  // KIMI_CODE_HOME points at a tmp home; ...
  // LIVE GATE: requires AMADEUS_KIMI_PRINT_LIVE=1 + a kimi binary
  // (AMADEUS_KIMI_BIN or PATH). SPENDS Kimi credits — exactly two short print
  // sessions per run, one per state (CC-1). Skips cleanly otherwise.
  ```
  → **「出荷 dist ツリーを tmp へコピーして駆動」という既習様式が既に存在する**(`cpSync` で dist/kimi を tmp に置き、環境変数で HOME を隔離)。#1589 の「出荷 dist 導入」はこの様式に倣える。ただしこのテストは live gate 付き(クレジット消費)で既定 skip。
- **インストーラ E2E(ネットワーク境界を fake)**: `tests/e2e/setup-install.test.ts:1-19` ヘッダ verbatim(抜粋):
  ```
  // Install E2E (NFR-001, US-A1): spawns the *real built* amadeus-setup binary
  // as its own child process against a real temp target directory, using a
  // real dist/claude archive fixture. The network boundary is faked by
  // rewriting fetch() calls at process start (tests/lib/setup-fetch-shim.ts,
  // via `bun --preload`) ... offline by default (cicd-pipeline.md).
  ```
  → **オフライン既定・実バイナリ spawn・実 dist アーカイブ fixture** という、live gate 不要の E2E 様式。#1589 が要求する「出荷 dist 導入 → CLI 駆動」は、ハーネス CLI(claude 等)を起動せずとも **この様式(`bun <tmp>/.claude/tools/amadeus-plugin.ts ...` を spawn)で成立しうる** — 要件段の設計選択肢。

### 7.3 e2e プロファイルの実行条件(CI で走るか)

`tests/run-tests.ts` 実測:
- `:71` `type Level = "smoke" | "unit" | "integration" | "e2e";`
- `:121` `--e2e           Full lifecycle, worktree, and rendered terminal journeys`
- `:125` `--ci            smoke + unit + integration`
- `:126` `--release       smoke + unit + integration + e2e`
- `:197-200` の `case "--ci":` は `runSmoke/runUnit/runIntegration` のみを true にする(`runE2e` を含まない)
- `:1171-1213` `if (args.runE2e) { ... }` — TUI 群を preflight ゲートで分割実行

CI 側:
- `.github/workflows/ci.yml:163` verbatim: `run: bun run test:ci -- -P 4`
- `package.json:19` `"test:ci": "bun tests/run-tests.ts --ci"`
- `grep -n "run-tests\|--release\|--e2e" .github/workflows/*.yml` のヒットは上記 `:163` のみ。

**確定: e2e 層は既定 CI(`--ci`)で一切実行されない。`--release` / `--e2e` を明示したときのみ走る。** これは #1589 の要件設計に直結する制約 — 「tests/e2e/ に置く」だけでは CI のリグレッションガードにならない(実行トリガーを要件で決める必要がある)。

---

## 8. 出荷面(dist / self-install / plugin バンドル)

### 8.1 ハーネス dist の plugin 配布物

`find dist/claude -name '*plugin*'`:
```
dist/claude/.claude/hooks/amadeus-plugin-compose.ts
dist/claude/.claude/tools/amadeus-plugin-activation.ts
dist/claude/.claude/tools/amadeus-plugin-compose.ts
dist/claude/.claude/tools/amadeus-plugin.ts
```
同構造が `.codex` / `.cursor` / `.opencode` / `.kimi-code` の各 dist と self-install ツリーに存在(`git ls-files | grep -i plugin` の出力より、`hooks/amadeus-plugin-compose.ts` + `tools/` 3 本 × 5 面)。opencode は加えて `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts`(ハーネス自身のプラグイン機構であり本 intent の plugin 機能とは別物 — 名前が紛らわしいので要件段で混同しないこと)。

### 8.2 中立バンドル `dist/plugins/`

`find dist/plugins -maxdepth 2 -type d` / `-maxdepth 3 -type f`:
```
dist/plugins/formal-model-check/            ← 中立バンドル
dist/plugins/formal-model-check/plugin.json
dist/plugins/formal-model-check/README.md
dist/plugins/formal-model-check/stages/formal-model-check.md
dist/plugins/formal-model-check/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/INSTALL.md   ← 7 面
```
→ **7 面 install バンドルの実体は各 `INSTALL.md` 1 枚**(`scripts/plugin-projection.ts:798-801` の `installArtifacts(plugin, harness)` が生成)。`PACKAGE_HARNESSES`(7)の実消費点がここ。

`find . -name "INSTALL.md" -not -path './amadeus/*'` の結果は上記 7 枚のみ(**リポジトリルートに INSTALL.md は無い**)。

### 8.3 SessionStart hook の配布位置

`dist/<harness>/<dir>/hooks/amadeus-plugin-compose.ts` + `settings.json.example` の SessionStart 配列(§2.6 で `dist/claude/.claude/settings.json.example:34-46` を実読)。

---

## 9. 各 Issue の欠陥所在まとめ(確定)

| Issue | 欠陥所在(file:line) | 機序 | 検出できていない理由 |
| --- | --- | --- | --- |
| **#1575** | `scripts/promote-self.ts:184`(定義 5) vs `scripts/plugin-projection.ts:42-50`(定義 7) | 同名 export の二重定義。5 値の canonical は `plugin-projection.ts:56` `SELF_INSTALL_HARNESSES`(コメント `:53-55` が promote-self の 5 面と明言)。promote-self 側が誤った名前で再定義している | 衝突自体を見るガードが無い。`t-plugin-projection-packaging.test.ts:44` は別名 import で回避し、`:48` は 7 値を三重にハードコード |
| **#1585** | `packages/framework/core/tools/amadeus-plugin.ts:591-593` | standalone doctor が `result.lines` を直接ループ。0件 degrade を持つ純関数 `doctorPluginRows`(`:534-536`)を通らない。統合面 `amadeus-utility.ts:2890` は通る | `t314:36-38` / `t315:113,204` はいずれも純関数・統合面のみを assert。`t299:233-238` は 1-plugin 状態のみ |
| **#1586** | `packages/framework/core/tools/amadeus-plugin-compose.ts:1150`(`mkdirSync recursive`)⇔ `:1154`(`rmSync` ファイルのみ)の非対称。判定側は `amadeus-plugin.ts:377` `baselineRestored = record.plugins.size === 0`(FS を見ない) | compose が作った親ディレクトリを drop が剪定しない。計画層(`planPluginDrop:703-730`)・snapshot 層(`buildHostSnapshot:204-223`)ともにディレクトリ語彙を持たない | `t299:88-101` の `hashSurface` がファイルバイトのみをハッシュ(`:94-97`)し空ディレクトリを構造的に無視。`t254:288` はファイル1点。`t311` はパッケージャ側で射程外 |
| **#1589** | 欠落面(不在)。`tests/e2e/` に plugin 系テスト 0 件(`git ls-files tests/ \| grep plugin` = 24 件、全て unit/integration/fixtures) | 全 plugin テストが正本パスを in-process 駆動。唯一の spawn(`t299:206`)も正本パスかつ recompile が非ゼロ終了する合成ホスト。`--single` なし到達は seam 単体呼び出しのみ | — |

### 追加の設計制約(要件段で必ず扱うべき)

1. **e2e は既定 CI で走らない**(`run-tests.ts:125` `--ci` に e2e 非含有、`ci.yml:163` が `test:ci`)。tests/e2e/ に置くだけではリグレッションガードにならない。
2. **`baselineRestored` の定義が record 基準**(`amadeus-plugin.ts:377`)。#1586 を直すなら判定基準そのものを FS 実測へ寄せるか、除去側を対称化するかの設計判断が要る(`cid:code-generation:c1-narrow-fix-post-apply-remeasure` — ガード補填後に元症状の閉包を再実測すること)。
3. **`.amadeus-plugin-drops.json` 等のエンジン dot-state は drop 後も残る**(§5.1)。「baseline 復元」の境界定義を要件で明示しないと、修正範囲が発散する。
4. **#1575 の改名は展開後リテラルの同期が必要** — `t209-...:152` と `t-plugin-projection-packaging.ts:161` の 2 箇所(§3.3 キー2)。
5. **`packages/framework/core/tools/` を触ると 7 ハーネス dist 再生成が必要**(`cid:build-and-test:bt-dist-regen-seven-harnesses`)。#1585/#1586 はいずれも core/tools 変更なので該当。
6. **core/tools のコメント・文字列に `scripts/<file>` トークンを書かない**(`cid:code-generation:c1-1569-shipped-comment-vocab`)。#1575 の修正で promote-self ↔ plugin-projection の相互参照コメントを書く際に抵触しうる。
