# re-scan: 260810-plugin-manifest-resoluti（Issue #2823 / ミラー #2829）

**Date**: `2026-08-10`
**測定 ref (observed)**: `7b9391be2db4fad791d637293ea442d5a1462bac`（= 本 worktree HEAD。`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `df1c874cfb397fafe877a72f00a82664a59689ae`（`re-scans/` 中で最新の observed = 直前 intent `260810-plugin-harness-dir-token` の測定 ref。HEAD の祖先であることを実測確認: `git merge-base --is-ancestor df1c874cf HEAD` exit 0。`git rev-list --count df1c874cf..HEAD` = **13 commits**、**302 files changed**。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
**Focus**: [Issue #2823](https://github.com/amadeus-dlc/amadeus/issues/2823) — plugin manifest の**所在非対称**（composed ツリーに `plugin.json` が配送されないのに、advisory 宣言の読み手は `<projectRoot>/plugins/<name>/plugin.json` だけを見る）と、evaluator argv の **repo ルート相対**指定（`plugins/formal-model-check/plugin.json:61`）。ミラー Issue #2829
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー 2/2 **CONFIRMED_WITH_REFINEMENTS → ESTABLISHED_WITH_REFINEMENTS**（run `xrev-2823-20260810T094918Z`、cross-review target SHA `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`）。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ

---

## 行番号引用の currency（実測の記録であり、免除の主張ではない）

1. **レビュー区間の非交差**: `git diff --name-only c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131..HEAD` を本記録の引用パス（`amadeus-advisory-declaration.ts` / `amadeus-advisory-choice.ts` / `plugins/formal-model-check/plugin.json` / `scripts/harness-transform.ts` / `amadeus-plugin.ts` / `amadeus-plugin-compose.ts` / `scripts/plugin-projection.ts` / `amadeus-plugin-activation.ts` / `t445-*` / `t526-*` / `t528-*` / `t353-*` / `t340-*` / 前 intent の `requirements.md`）で絞った結果は**空**（唯一の grep ヒットは別 intent の `260809-cg-attribution-stats/inception/requirements-analysis/requirements.md` であり引用対象外）。よって全 file:line は **observed 断面で有効**であり、行番号の再解決は構造的に no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。
2. **base..observed は患部の隣を触っている**: 区間 `df1c874cf..HEAD` は **PR #2811**（`c51afbd0a`、「resolve {{HARNESS_DIR}} at the plugin staging seed」）を含み、`packages/framework/core/tools/amadeus-plugin.ts` / `scripts/plugin-projection.ts` / `packages/framework/core/tools/amadeus-harness.ts`（`rulesSubdirFor` `:71`）と `tests/integration/t531-plugin-harness-literal-guard.integration.test.ts`（新設）を変更している。したがって前回 scan（observed `df1c874cf`）の `amadeus-plugin.ts` 系行番号は**陳腐化しており**、本記録の行番号は observed で取り直した（後述の訂正表）。

したがって currency の根拠は「review..observed が引用パスと非交差」+「base..observed の差分（#2811）は本記録で行番号取り直し済み」の二重である。

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review` に従い、述語をそのまま再実行できる形で結果と同所に置く。すべて worktree ルートで実行。Architect が observed 断面で再実行したものを記す。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git merge-base --is-ancestor df1c874cf HEAD` / 同 `c51afbd0a HEAD` | 両者 **exit 0**（祖先性確認） |
| P1 | `git diff --name-only c51afbd0a..HEAD` を引用パスで絞る | 引用パスへのヒット **0**（構造的 no-op） |
| P2 | `git diff --name-only df1c874cf..HEAD` | **13 commits / 302 files**。`amadeus-plugin.ts` / `plugin-projection.ts` / `amadeus-harness.ts` / `t531` を含む = **PR #2811 そのもの** |
| P3 | `grep -rn "CLAUDE_PLUGIN_ROOT" packages/ plugins/ scripts/` | **0 hit** — marketplace 経路の staging population は repo 内に証拠なし |
| P4 | `grep -rn "pluginManifestPath" packages/framework/core/ --include="*.ts"`（test 除外） | 定義 `amadeus-advisory-declaration.ts:295` + 読み手 **ちょうど 2 箇所**（`:312` / `:392`） |
| P5 | `ls plugins/` | **2 plugin のみ**（`formal-model-check` / `pr-convergence`） |
| P6 | `grep -l "advisories" plugins/*/plugin.json` | **`plugins/formal-model-check/plugin.json` のみ**（`pr-convergence` は 0） |
| P7 | `plugins/formal-model-check/plugin.json` の `advisories` 直下を実読 | `advisories` キー `:50-71`、evaluator `argv` `:59-65`、機械的 repo ルート相対 argv は **`:61` の 1 本のみ** |
| P8 | `grep -n "persistentInstall" packages/framework/core/tools/amadeus-plugin.ts` + `prepareInstall`/`handleInstall` 実読 | `:1117-1118`（`projectSource` / `persistentInstall` 判定）、`:1160`（project supply への FULL bundle コピー） |
| P9 | `tests/integration/t353-plugin-install-verb.integration.test.ts` の persistent 腕を実読 | `:254-274` が dot-dir ホスト（`.codex`）への install で **persistentInstall=true** を被覆（project supply・config commit・staging・composition の 4 面永続化を pin）、`:276-324` が rollback を pin。**ただし advisory 宣言の読み手との join（install → declaration 読取 → argv 解決）はどのテストも通らない** |
| P10 | `grep -n 'join(projectDir, "plugins", "demo")' tests/integration/t445-advisory-declaration-supply.integration.test.ts tests/integration/t526-advisory-handoff-stage.integration.test.ts tests/integration/t528-authoring-hold-end-to-end.integration.test.ts` | t445 `:224` / t526 `:59` / t528 `:103`（宣言の書き込みは各行 +1〜2 行後）— **すべて dogfood レイアウト**（`<projectDir>/plugins/demo/plugin.json` を手書き）。consumer レイアウトのテストは **0** |
| P11 | `tests/integration/t531-plugin-harness-literal-guard.integration.test.ts` 実読 | #2811 で新設されたガードは **plugin 散文（stage doc）のハーネスリテラルのみ**を走査し、`plugins/**/plugin.json` の argv は**誰も走査していない** |

---

## 患部（PROVEN）

### 非対称 1 — manifest の所在: 配送側は渡さず、消費側は project ルートだけを見る

- **配送側**: compose が manifest から集めるのは `stages` と `tools` のみ（`amadeus-plugin-compose.ts:895` の `ownedPaths` = `m.stages.map(...) + m.tools.map(...)`）。`composeWriteSet`（`:1390-1408`）の `hostWrites` も stage/tool/shared コピーのみで、**`plugin.json` は composed ツリー `<harnessDir>/plugins/<name>/` に配送されない**（前回 scan N-9 と一致: `.claude/plugins/pr-convergence/` は `stages/` と `tools/` のみを持つ）。
- **消費側**: advisory 宣言の唯一の読み点は `pluginManifestPath(projectRoot, plugin)` = `join(projectRoot, "plugins", plugin, "plugin.json")`（`amadeus-advisory-declaration.ts:295-297`）。読み手は **ちょうど 2 箇所**（`:312` `declaredAdvisoriesForPlugin` / `:392` `declarationFor`）。`projectRoot` は `projectRootForHost(hostRoot) = dirname(hostRoot)`（`amadeus-plugin-activation.ts:110-112`）で導かれる。
- **結果**: manifest が無ければ `:312-313` `if (!fs.existsSync(path)) return [];` で**無音 fail-open**（zero impact、監査・ログなし）。`declarationFor` も `:393` / `:397-399` で同様に **silent null** を返し、`declaredFormalCheckArgv`（`:403-410`）/ `declaredHandoffStage`（`:413-420`）へそのまま伝播する。

### 非対称 2 — evaluator argv は repo ルート相対、cwd は projectRoot

- `plugins/formal-model-check/plugin.json:59-65` の evaluator argv は逐語 `["bun", "plugins/formal-model-check/tools/tla-authoring.ts", "advisory", "hold"]`。**機械的に解決される repo ルート相対 argv は `:61` の 1 本のみ**。
- spawn は `spawnEvaluator(projectRoot)`（`amadeus-advisory-declaration.ts:347-357`）で `cwd: projectRoot`・shell なし。したがって argv の相対要素は **projectRoot から見た `plugins/<name>/tools/…` が存在するときだけ解決する**。composed 配置先は `<harnessDir>/plugins/<name>/tools/…`（`amadeus-plugin-compose.ts:386` / `:412` の `posix.join("plugins", pluginName, rel)`）であり、consumer の projectRoot に `plugins/<name>/` は通常存在しない。
- **engine 側の双子**: `amadeus-advisory-choice.ts:925` の hard-coded route も逐語 `"bun", "plugins/formal-model-check/tools/run-model-check.ts"` — 同じ根（repo ルート相対）を持つ engine 内コピー。

### 訂正表（brief 側の行番号近似 → Developer 実測。ツリーのドリフトではない）

| 対象 | brief 側近似 | observed 実測 |
|---|---|---|
| `copyPluginSource` / `copyRealFiles` | 前回 scan の `:659-688` 系 | **`:702-741`**（`:702-714` / `:721-741`） |
| `collectPluginSources` / `seedStaging` | 前回 scan の `:821-853` 系 | **`:874-906`**（`:874-889` / `:894-906`） |

区間 diff は引用パスと非交差（P1）であり、行シフトは **base..observed の PR #2811** によるもの。前回 scan 記録の行番号はその観測 ref では正しい。

---

## advisory 宣言の消費者グラフ（PROVEN、observed 断面）

```
plugins/formal-model-check/plugin.json:50-71 (advisories 宣言、argv :59-65)
  ↑ 読むのは projectRoot/plugins/<name>/plugin.json のみ
amadeus-advisory-declaration.ts
  pluginManifestPath            :295-297   唯一の解決規則（authoring レイアウト前提、:289-294 doc comment）
  declaredAdvisoriesForPlugin   :305-329   :312-313 manifest 不在 → 無音 []
  declarationFor                :386-400   :393/:397-399 → 無音 null
  declaredFormalCheckArgv       :403-410   null 伝播
  declaredHandoffStage          :413-420   null 伝播
  spawnEvaluator                :347-357   cwd: projectRoot、shell なし、timeout 60s / buffer 8MiB、失敗は unreadable verdict → hold（fail-closed、:340-343 コメント）
  advisoriesForHost             :366-383   activation 判定 + composed plugins の宣言を flatMap
  verdictSummary / advisoryFromEvaluatorRun :214-232 / :241-257（verdict が権威、no-hold 以外は raise）
amadeus-plugin-activation.ts
  projectRootForHost            :110-112   hostRoot（harness ディレクトリ）の親 = projectRoot
amadeus-advisory-choice.ts
  :948-978  declaredFormalCheckRoute — declaredFormalCheckArgv を引きトークン解決（:962-967）
  :729-741  directiveItemFor — declaredHandoffStage で handoff を載せる（null なら素の item）
  :980-986  DECLARED_RELEASE_RULE — formalCheck:null は engine 側 release 経路なし
  :925      engine 側双子 argv（repo ルート相対）
  :495-497  advisoryChoiceOptionIds（run-now 強制の提示側）
  :1012     run-now 以外は continue
```

**全経路で degradation は無音**である（manifest 不在・parse 不能・宣言なし・route なしのいずれも、audit event・stderr・ログを一切出さない）。

---

## mechanism settlement — install 経路の全列挙（r1/r2 不一致を測定で解決）

消費者ワークスペースに `<projectRoot>/plugins/<name>/`（= project supply）が**存在しうるか**を、導入経路の全列挙で判定した。

| # | 経路 | 根拠 | project supply | advisory の運命 |
|---|---|---|---|---|
| 1 | **folder-drop**（installDoc の primary 腕、`plugin-projection.ts:634`） | バンドルを `<harnessDir>/.amadeus-plugin-src/<name>/` へ置く指示 | **作られない** | (a) manifest-absent fail-open — advisory は**無音で全滅** |
| 2 | **`install <path>` verb + dot-dir ホスト**（`amadeus-plugin.ts:1117-1118` で `persistentInstall = selected.projectDir !== hostRoot`、`:1160` で `deps.copyPluginSource(src, projectSource)`） | `projectDirForHost`（`amadeus-plugin-selection.ts:40-42`）は dot-dir ホストの親を projectDir とする。**FULL bundle（plugin.json + tools）が `<projectRoot>/plugins/<name>/` へコピーされる** | **作られる** | (c) both-working — manifest も argv も解決する |
| 3 | **marketplace / native-manifest**（installDoc `:622-631`） | `.claude-plugin/plugin.json` 経由 | repo 内に staging population の証拠なし（P3: `CLAUDE_PLUGIN_ROOT` 0 hit） | せいぜい (a)。**UNMEASURED** |
| 4 | **self-install / promote-self**（本 repo 自身） | 権威 `plugins/` が project ルートに在る | 常に存在 | (c) — **dogfood masking**。本 repo で何を回しても欠陥は見えない |

**新規知見（両レビュアの共有前提を訂正）**: r1/r2 とも「repo ルート `plugins/` を consumer に作らせる文書化経路は存在しない」を前提としていたが、**経路 2（install verb の persistent 腕）がこの前提を偽とする**。前 intent の `requirements.md:90`（「repo-root `plugins/` を作る運用は想定しない」）はこの腕によって**文字通り falsify される**。installDoc 自体（`:636`）は install verb に言及するが、dot-dir ホストへ投げた場合に project ルートへ FULL bundle が永続化されることは**どこにも開示されていない**。

**settlement**: r2 の「(a) が主経路」は **primary な文書化指示（経路 1 の folder-drop）については成立**する。r1 の Case B probe（manifest だけあって tools が無い手作り hybrid）は **hold-without-clean-release (b)** に相当し、文書化経路では到達不能で手作り hybrid のみ。両者とも経路 2 の project-supply 腕を見落としていた。

---

## 番号付き知見

### N-1 — 所在非対称は配送側と消費側の**両方が「正しく」実装された結果**である（PROVEN）

配送側（compose は stages/tools のみを配る、`:895` / `:1390-1408`）も消費側（`<projectRoot>/plugins/<name>/plugin.json` のみを読む、`:295-297` / `:312` / `:392`）も個々には設計どおり。欠陥は**契約の継ぎ目**にあり、どちらか片方のバグではない。

### N-2 — evaluator argv の root-relative は `:61` ただ 1 本、cwd=projectRoot と組で dogfood 専用になる（PROVEN）

`spawnEvaluator`（`:347-357`）は `cwd: projectRoot` で shell なし spawn。argv の第 2 要素 `plugins/formal-model-check/tools/tla-authoring.ts`（`plugin.json:61`）は、projectRoot に authoring ツリーがある環境でのみ解決する。engine 側双子 `:925` も同根。

### N-3 — install verb の persistent 腕は FULL bundle を project ルートへ永続化する（PROVEN、新規）

`prepareInstall`（`:1102-1129`）が `persistentInstall` を判定し、`handleInstall:1160` が `copyPluginSource(src, projectSource)` で **plugin.json を含む全ファイル**を `<projectRoot>/plugins/<name>/` へ置く。t353 `:254-274` が 4 面永続化（project supply / config / staging / composition）を pin 済み。**ただしこの腕が advisory 宣言経路と join するところ（install → 宣言読取 → argv 解決）を通すテストは存在しない**（P9）。

### N-4 — t445:155-160 は無音 fail-open を**契約として pin している**（PROVEN）

`"a composed plugin with no manifest on disk raises nothing"`（t445-advisory-declaration-supply `:155-160`）は、まさに Issue が欠陥とする振る舞いを期待値として固定している。**loud 化はこのテストの意図的な書き換えを要する**（機械的修正では壊せない契約）。

### N-5 — advisory テストはすべて dogfood レイアウトで、consumer レイアウトのテストは 0（PROVEN）

t445 `:224-226` / t526 `:59-61` / t528 `:103-105` はいずれも `<projectDir>/plugins/demo/plugin.json` を手書きして宣言を供給する。t340（`:196` / `:220` / `:240`）は `cpSync(FIXTURE, join(project, "plugins", PLUGIN))` で project supply を手作りする。t353 は install verb の persistent 腕を被覆するが advisory 消費との join はない（N-3）。**consumer レイアウト（staging にのみ bundle があり project supply が無い）を組むテストは 0 件**。

### N-6 — 同根 census: 2 plugin / 1 argv / 2 readers / 1 twin（PROVEN）

- plugin は **2 つのみ**（P5）。`advisories` キーは `formal-model-check/plugin.json:50-71` にのみ存在（P6）。
- 機械的 repo ルート相対 argv は **`:61` の 1 本のみ**（P7）。散文中の `bun plugins/<name>/tools/…` 11 行は前回 scan の扱い（#2790 系、本 Issue の射程外）。
- `pluginManifestPath` の読み手は **ちょうど 2**（P4）。engine 側双子は `amadeus-advisory-choice.ts:925` の 1 箇所。

### N-7 — 分岐 (b)（hold-without-clean-release）は文書化経路では到達不能（DEDUCED、強）

(b) は「manifest は読めるが evaluator argv が解決しない」を要する。文書化経路は manifest あり（経路 2/4 = tools も同梱で argv も解決）か manifest なし（経路 1/3 = (a)）のどちらかしか生まない。**手作り hybrid（manifest のみ供給）でのみ (b) に入る**。なお argv 解決失敗は spawn 側では unreadable verdict → **hold 方向に fail-closed**（`:340-343` の設計コメント）であり、静かに見逃す向きではない。

### N-8 — ガード空白: `plugins/**/plugin.json` の argv を走査するガードは存在しない（PROVEN）

#2811 が新設した t531 は plugin **散文**のハーネスリテラル走査であり（P11）、manifest argv は対象外。Issue 完了条件 3 の述語（`plugins/**/plugin.json` の root-relative argv 走査）は**新規**であり、Issue 自身が指摘するとおり現行配置で恒久赤になりうる注意（permanent-red caveat）が付く。

### N-9 — #2811 で経路Bの「逐語」前提は部分的に更新済み（PROVEN、前回 scan からの差分）

`copyRealFiles` は `harnessDir` パラメータを取り（`:721-727`）、staging 宛てコピーでは `seedBytesForHarness`（`:669-675`）が `{{HARNESS_DIR}}` を解決する（`stagingHarnessDirOf` `:659-664` が判定、authoring 宛ては意図的に除外）。compose 本体に置換器が無い事実は不変だが、「self-install 5 面は置換を一度も通らない」という前回 N-3 の帰結は **#2811 で解消済み**。本 Issue の患部（manifest 所在・argv）はこの変更と**直交**している。

---

## Issue #2267 との関係（evidence のみ。統合/分離の裁定は行わない）

実測が示す関係:

- **同根を共有**: #2267 の根（projection が `plugin.json` を供給しない）は、本 Issue の非対称 1 と**同一**である（配送側 N-1）。
- **#2267 が覆わない範囲（#2823 の delta）**: argv/cwd 非対称（非対称 2）、`:925` の activation route 双子、`declarationFor` / `declaredFormalCheckArgv` / `declaredHandoffStage` の silent-null degradation、fail-open/fail-closed の分岐分析（N-7）、bug 再分類の論点、drift guard（N-8）。
- **新規事実**: install verb の project-supply 腕（N-3）は **#2267・#2823 のどちらの記述にも登場しない**。

**統合/分離の裁定は requirements-analysis 以降に委譲する**（本 RE の適用範囲外）。

---

## テスト / ガード面（failing-first テストの置き場）

- **t445 consumer-layout variant**: `declaredAdvisoriesForPlugin` を staging-only レイアウト（project supply なし）で呼び、現行は無音 `[]`（fail-open）であることを可視化する variant。loud 化を選ぶ場合の failing-first 置き場。
- **t353-adjacent dot-dir-host install テスト**: install verb（persistent 腕）→ 宣言読取 → evaluator spawn までを通す join テスト。現行でも (c) が成立するはずだが、**この join を pin するテストは存在しない**（P9）。
- 完了条件 3 の恒久ガードは新規述語（N-8）。t531 / t377 の predicate 基盤（`tests/lib/boundary-guard.ts`）は再利用可能だが、対象は `.json` の argv であり既存述語の拡張ではない。

---

## UNMEASURED（設計段へ持ち越す。推測で埋めないこと）

- **E2E consumer workspace での compose → next → checkpoint**（Issue 完了条件 1）は未実測のまま。本 scan は静的な所在・解決規則の実測であり、実ワークスペースでの advisory 発火/不発は観測していない
- **marketplace / native-manifest 経路の staging population**（P3 で repo 内証拠 0、`.claude-plugin/plugin.json` が実際にどこへ何を置くかはホスト側仕様の実測を要する）
- **persistentInstall=true → advisory 宣言経路の join**（N-3/P9。4 面永続化の pin はあるが、宣言が実際に読まれ argv が解決するところまでの直接 pin は無い）

---

## 技術的負債シグナル

1. **doc comment と配送契約の矛盾**: `amadeus-advisory-declaration.ts:289-294` のコメントは「宣言は **the plugin source tree next to the project root** から読む — the layout this repository composes from」と authoring レイアウト前提を明言するが、配送契約側（前 intent `requirements.md:86`「plugin.json は composed ツリーへ配られない」/ `:90`「repo-root `plugins/` を作る運用は想定しない」）はその前提を供給しない。**コメントが前提とするレイアウトを、文書化された導入経路の primary 腕が作らない**。
2. **silent degradation の全面性**: manifest 不在・parse 不能・宣言なし・route なしがすべて無音（N-1/N-4）。しかも t445:155-160 がこれを契約として pin しているため、観測可能性の追加は「契約変更」として扱う必要がある。
3. **installDoc の 2 腕が欠陥露出を変える**: folder-drop（(a) 全滅）と install verb（(c) 動作）で**同じ plugin の振る舞いが導入手順の選択だけで変わる**のに、その差はどこにも開示されていない（`:634` vs `:636`）。

---

## 本 RE の適用範囲外（明示）

修正案の設計・選定（例: projection に manifest を載せる / 宣言読み手を staging 側へ向ける / argv をトークン化する / loud 化の契約変更、のいずれも）は本段の所掌ではない。**requirements-analysis / application-design が行う**。Issue #2267 との統合/分離の裁定も同様に委譲する。本記録は、その裁定を証拠から下せる状態にすることのみを目的とする。
