# re-scan: 260810-plugin-harness-dir-token（Issue #2790 / ミラー #2799）

**Date**: `2026-08-10`
**測定 ref (observed)**: `df1c874cfb397fafe877a72f00a82664a59689ae`（= 本 worktree HEAD = `origin/main`。`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `91f37ec8589cdf468599b4787e27e5125d4d16e8`（`re-scans/` 中で最新の observed。HEAD の祖先であることを実測確認。`git rev-list --count 91f37ec85..HEAD` = **20 commits**、**117 files changed**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
**Focus**: [Issue #2790](https://github.com/amadeus-dlc/amadeus/issues/2790) — `plugins/pr-convergence/stages/pr-convergence.md:180` が、ハーネス中立であるべき plugin stage doc に Claude 固有リテラル `.claude/tools/amadeus-sensor.ts` を焼き込んでいる。ミラー Issue #2799
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー 2/2 CONFIRMED（run `xrev-2790-20260810T033737Z`）。レビュー verdict を Developer scan の一次入力とし、observed 断面の verbatim 実読で二重化
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ

---

## 行番号引用の currency（実測の記録であり、免除の主張ではない）

1. **区間の非交差**: `git diff --name-only 91f37ec85..HEAD` を患部 7 パスへ絞った結果は **空**。患部 7 パスは以下。

   - `plugins/pr-convergence/**`
   - `scripts/harness-transform.ts`
   - `scripts/plugin-projection.ts`
   - `packages/framework/core/tools/amadeus-plugin.ts`
   - `tests/unit/t146-core-hygiene.test.ts`

2. **クロスレビュー target SHA との非交差**: 目標 SHA `5564dccd1` / `d95d719ce` のいずれについても、上記パスに変更は現れない。

したがって本ファイルおよび codekb 各節の file:line は **observed 断面で有効**であり、行番号の再解決は構造的に no-op である（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review` に従い、述語をそのまま再実行できる形で結果と同所に置く。すべて worktree ルートで実行。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git diff --name-only 91f37ec85..HEAD`（患部 7 パスで絞る） | 区間 **117 files / 20 commits**、患部ヒット **0** |
| P1 | `grep -rn "\.claude/\|\.codex/\|{{HARNESS_DIR}}" plugins/` | **1 hit**（patient `pr-convergence.md:180` のみ） |
| P2 | `plugins/` 配下の `.md` 数 | **4** |
| P3 | `diff -r plugins/pr-convergence dist/plugins/pr-convergence/<h>/plugins/pr-convergence`（8 面） | **8/8 IDENTICAL** |
| P4 | `sed -n '180p'` を中立バンドル + 8 面へ | **9/9 が `.claude/tools/` を運ぶ** |
| P5 | `find dist/<harness> -maxdepth 3 -name plugins`（8 面） | **0 hit** |
| P6 | `grep -rn "substituteToken\|HARNESS_DIR\|harness-transform" packages/framework/core/tools/amadeus-plugin*.ts` | **1 hit**（`amadeus-plugin.ts:32`、`KNOWN_HARNESS_DIRS` の import） |
| P7 | `grep -rn "amadeus-sensor.ts\|bun plugins/\|bun \.claude" plugins/ --include="*.md"` | **12 行** |
| P8 | `grep -rnE "\.(claude\|kiro\|codex)/" plugins/ --include="*.md"` | **1 hit**（patient のみ）。7 ハーネスディレクトリ全部へ広げても **同じ 1 hit** |
| P9 | `grep -rn "{{HARNESS_DIR}}/tools/" packages/framework/core/ --include="*.md" \| wc -l` | **92** |
| P10 | `grep -rn "amadeus-sensor.ts fire" packages/framework/core/` | `.ts` / hooks のみ、`.md` は **0** |
| P11 | `git ls-files` を `dist/` と self-install `plugins/` へ | どちらも tracked **0** |

---

## 患部（PROVEN）

`plugins/pr-convergence/stages/pr-convergence.md:180`:

```
bun .claude/tools/amadeus-sensor.ts fire pr-convergence-report-format \
```

この行を含むブロックの散文は逐語で次を宣言する:

> The manual fire IS the normal delivery path, not a fallback: the report is written by the CLI through Bash, so the harness's write-time hook (which watches Write/Edit turns of the active stage) never observes it.

すなわち**この呼び出しは fallback ではなく通常経路**であり、ハーネス固定は実害を伴う。

---

## 二経路と非対称な置換器（PROVEN）

### 経路A — build-time packager（置換器あり）

- `scripts/harness-transform.ts:11` `HARNESS_TOKEN` / `:14` `substituteToken` / `:23` `applyRulesRename`（`${harnessDir}/rules/` アンカー、claude は `rulesRename === null` で no-op）/ `:27` `isMarkdownProsePath`（`.md` / `.md.example` のみ）/ `:33-46` `transform()` は拡張子だけで分岐し `.json` / `.ts` / `.snippet` は Buffer 素通し。設計意図は header `:8-9` に逐語。
- `scripts/plugin-projection.ts:262-278` `projectPluginArtifacts` が `:274` で `transform` 適用、`pluginHostPrefix`（`:148-150`）で `plugins/<name>` へ名前空間化。`:283-293` `buildPluginBundle`（中立・逐語）、`:304-307` `buildPluginProjection`、`:670-685` `installArtifacts`、`:696-714` `projectPluginForHarness`、`:718-731` `buildHarnessTree`、`:786-800` `checkHarnessTree`。

### 経路B — runtime compose（置換器なし）

- P6 の通り compose 側に置換器は無い。
- `amadeus-plugin.ts:659-671` `copyPluginSource`（tmp + rename swap）、`:676-688` `copyRealFiles`、`:686` `writeFileSync(join(outDir,name), readFileSync(abs))` でバイト逐語、symlink は `:681-684` で skip。
- `amadeus-plugin-compose.ts:381-386`（tools）/ `:407-412`（stages）が生バイトを `posix.join("plugins", pluginName, rel)` へ push。
- ソース: `amadeus-plugin.ts:821-838` `collectPluginSources` は repo ルート `plugins/`（`PLUGIN_AUTHORING_DIR_NAME`、`:578`）優先、次に staging root `.amadeus-plugin-src`（`:563`、`pluginSourceRootOf` `:570-572`）。`:841-853` `seedStaging` も逐語。
- 消費者への導入手順 `plugin-projection.ts:620-664` `installDoc` は、バンドルを `<harnessDir>/.amadeus-plugin-src/<name>/` へ置くか `bun <harnessDir>/tools/amadeus-plugin.ts install <path>` を実行する形のみで、**repo ルート `plugins/` を作らせる指示は存在しない**。

---

## 番号付き知見

### N-1 — 経路A の置換は plugins コーパスで現状 100% no-op（PROVEN）

P3 = 8/8 IDENTICAL、P4 = 9/9 が `.claude/tools/`。`plugins/` にトークンが 0 件（P1）であるため、**`transform()` はこのコーパスで一度も発火していない**。

### N-2 — `dist/<harness>/<harnessDir>/plugins/` は生成されない（PROVEN）

`buildHarnessTree` / `checkHarnessTree` の呼び出し元は**テストのみ**。`scripts/package.ts` は `pluginBundleExpected` だけを import（`:67`、`:873`）。P5 = 0 hit。これは `plugin-projection.ts:4-5` の header コメントと**矛盾する**。実際に生成されるのは `dist/plugins/<name>/`（中立・逐語）と `dist/plugins/<name>/<harness>/`（導入バンドル・transform 適用）の 2 つ。

### N-3 — self-install は build script の中から経路B に乗る（PROVEN、critical）

`plugin-projection.ts:1019-1067` `projectInTemporaryWorkspace`: `:1025` で `dist/<harness>` を temp workspace へコピー、`:1031` `cpSync(pluginsSource, join(workspace,"plugins"))` で権威 `plugins/` を**逐語**コピー、`:1035` で `amadeus-plugin.ts compose` を spawn。呼び出し元は `scripts/promote-self.ts:382` `buildSelfInstallProjection`。

**含意**: `.claude/` / `.codex/` / `.cursor/` / `.opencode/` / `.kimi-code/` の plugin ツリーは **100% 経路B の産物**で `transform()` を通らない。「build-time = 置換済み / runtime = 逐語」という二分法は**偽**である。

### N-4 — 生きた漏洩（PROVEN）

self-install 5 面 × {`plugins/…`, `.amadeus-plugin-src/…`} = **10 ファイル**が同一ブロックを運ぶ。`.codex/plugins/pr-convergence/stages/pr-convergence.md:180` は `.claude/tools/` を指す。P11 により **すべてマシンローカル生成物**（tracked 0）。修正が触るのはソースと、必要なら transform ロジックのみ。

### N-5 — `HARNESS_PATH_RE` のカバレッジ不足（PROVEN）

`tests/unit/t146-core-hygiene.test.ts` の `HARNESS_PATH_RE = /\.(claude|kiro|codex)\//` は、**相異なる 7 ディレクトリ中 3 個**しか見ない。`.opencode` / `.cursor` / `.kimi-code` / `.pi` は今日の core 散文でも素通りする。

### N-6 — t146 の corpus 拡張は偽陽性 0（PROVEN）

P8 により、`plugins/` を t146 の corpus に足しても偽陽性 0、新規 carve-out 不要。⚠ 制約: 「core `.md` 50 件超がトークンを運ぶ」下限テストは core 前提のため、**2 テストの walk scope を分離**しなければならない。

### N-7 — digest との隠れ結合（所在は PROVEN、影響は DEDUCED）

`amadeus-plugin-compose.ts:921-972` `pluginContentDigest` / `digestBytes` は `plugin.manifest.stages` / `.tools` の**バイト**を sha256。置換を compose 内へ移す場合、digest を置換前／置換後どちらで取るかが**クロスハーネスの staleness 意味論**と t416 の determinism テストの意味を変える。

### N-8 — 先例（PROVEN）

P9 = **92**。散文中のツール呼び出しに対する `{{HARNESS_DIR}}/tools/` 形は core で確立（`conductor.md:105`、`reverse-engineering.md:139` 等）。ただし P10 の通り、**散文中の手動センサー fire は core に先例が 0**。

### N-9 — 配送範囲（PROVEN）

`plugin.json` は composed ツリーへ配送されない。`.claude/plugins/pr-convergence/` は `stages/` と `tools/` のみを持ち、manifest は staging `.amadeus-plugin-src/` にのみ存在する。

---

## 同根の兄弟欠陥 — 計 12 行、機序は 1 つ

P7 の 12 行の内訳:

| 分類 | 行 |
|---|---|
| ハーネス**固定**（patient） | `pr-convergence.md:180` |
| ハーネス接頭辞**欠落**（repo ルート相対 `bun plugins/<name>/tools/<tool>.ts`） | `pr-convergence.md:54` / `:80` / `:162` / `:214`、`formal-model-check.md:48`、`tla-authoring.md:65` / `:68` / `:110` / `:113` / `:116`、`formal-model-check/README.md:111` |

**DEDUCED（強）**: 後者 11 行は消費者ワークスペースでは解決しない。compose の書き出し先は `<harnessDir>/plugins/<name>/tools/…` であり、`installDoc` は repo ルート `plugins/` を作らせない。本 repo で動いているのは権威ソースがルートに在るからにすぎない。

**構造的含意**: 両者が要求する機構は同一の `{{HARNESS_DIR}}` 置換である。**入れれば 12 行すべてが射程に入り、入れなければ 12 行すべてが壊れたまま残る。**

補足: `formal-model-check/README.md` は `plugin.json` の stages/tools に無いため compose 対象外だが、導入バンドルには同梱される。

---

## ガードの現況

| ガード | corpus | 述語 | 判定 |
|---|---|---|---|
| t146-core-hygiene | `packages/framework/core` のみ | `/\.(claude\|kiro\|codex)\//` | 述語は近いが corpus に `plugins/` 無し。述語も 3/7 |
| t377-plugin-boundary-guard | `PLUGIN_SCAN_ROOTS = ["plugins"]`（`:33-35`、git-tracked 限定 `:56-62`、`RAW_PLUGIN_ALLOWLIST = []` で fail-closed） | `scanDistributionTreeForScriptsRefs`（`tests/lib/boundary-guard.ts:152`）は `scripts/` トークンのみ | corpus は正しいが述語が違う |
| t258（`boundary-guard.ts:54-66` `SCAN_ROOTS`） | `plugins/` / `dist/kimi` / `dist/pi` / `.kimi-code` / `.pi` を欠く | — | 走査外の blast radius は UNMEASURED |

**#2790 が漏れた機序**: 正しい corpus を持つガードが違うものを探し、正しい述語を持つガードが違う場所を見ていた。

---

## harnessDir 実測（`packages/framework/harness/*/manifest.ts`）

| harness | harnessDir | 定義行 |
|---|---|---|
| claude | `.claude` | `:45` |
| codex | `.codex` | `:24` |
| cursor | `.cursor` | `:30` |
| kimi | `.kimi-code` | `:35` |
| kiro | `.kiro` | `:27` |
| kiro-ide | `.kiro` | `:24` |
| opencode | `.opencode` | `:35` |
| pi | `.pi` | `:15` |

**8 ハーネス / 7 個の相異なるディレクトリ**（`.kiro` 共有）。`amadeus-harness.ts:38-46` `KNOWN_HARNESS_DIRS` と一致。self-install 面は **5**（claude / codex / cursor / opencode / kimi）。

---

## 検証面（failing-first テストの置き場）

- **経路A のピン**: `tests/unit/t-plugin-projection.test.ts:201-244`（`{{HARNESS_DIR}}` を使う唯一の plugin 側 fixture）、`tests/integration/t-plugin-projection-packaging.test.ts:101-112`、t303、t308、t309/t312、t310、t311、`t254-reference-plugin-lifecycle.test.ts:191-337`
- **経路B のピン**: `tests/integration/t416-self-install-plugin-projection.integration.test.ts`（冪等性／決定性 `:51-52`、`:111-113` — **`plugins/` → temp workspace → compose を実際に走らせる唯一の層**）、`tests/e2e/t416-self-projection-fresh-git.serial.test.ts`、`t-plugin-projection.test.ts:317-319`、t146、t377

---

## UNMEASURED（設計段へ持ち越す。推測で埋めないこと）

- トークンを実際に挿入して `bun run build` / `promote-self` を通した end-to-end 挙動
- dogfood でない実消費者ワークスペースでの試行
- `dist/pi` / `dist/kimi` / `.pi` / `.kimi-code` が `SCAN_ROOTS` に無いことの blast radius
- `harnessStageEntry` がホスト側 stage 読み取りをどう解決するか
- `resolveHarnessToolsDir`（`amadeus-plugin.ts:368`）が非散文ランタイム経路のハーネス差をどこまで吸収するか

---

## 本 RE の適用範囲外（明示）

修正案の設計・選定は本段の所掌ではない。少なくとも (a) compose 側での置換、(b) パス規約の変更、(c) packager 経由での seed という 3 方向が evidence 上ありうるが、**選定は requirements-analysis / application-design が行う**。本記録は、その裁定を証拠から下せる状態にすることのみを目的とする。
