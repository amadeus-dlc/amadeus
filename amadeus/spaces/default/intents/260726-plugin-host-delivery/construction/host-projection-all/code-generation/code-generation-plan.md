# Code Generation Plan — U3 host-projection-all

> 上流入力(consumes 全数): functional-design/business-logic-model、functional-design/business-rules、functional-design/domain-entities、nfr-design/logical-components、nfr-design/performance-design、nfr-design/security-design、nfr-design/reliability-design、nfr-design/scalability-design、units-generation/unit-of-work(U3 行)、requirements-analysis/requirements(FR-2)、harness-capability-matrix/code-generation/harness-capability-matrix(BR-U1-7 機械可読列挙)

## 目的

U2 が claude 面で確立した install bundle 投影(`scripts/plugin-projection.ts` の `projectPluginForHarness` / `claudeInstallArtifacts`)を、U1 マトリクスで確定した残 6 面へ一般化する。クラス別 3 分岐(`native-manifest` / `folder-drop-auto` / `manual-only`)+ OutDirRefusal 全集合(#27-32)+ `--check` stale/orphan 編入 + 0-plugin byte-identical を実装する。

## FR-2 合否 3 点との対応

- 合否 1(期待位置生成+トークン置換)→ `installArtifacts(plugin, harness)` を全 7 面へ一般化(business-logic-model フロー 1)
- 合否 2(0-plugin byte-identical + `--check` stale/orphan)→ `pluginBundleExpected` の 0-plugin 空マップ(no-op)+ `checkPluginProjections`(business-logic-model フロー 2、REL-U3-1/2)
- 合否 3(outDir 拒否集合)→ `classifyOutDir` 純関数(security-design 層 1、BR-U3-3)

## U1 マトリクス転記(BR-U1-7 機械可読列挙 — 推論禁止・転記のみ)

harness-capability-matrix.md (e) `class_assignment` からの転記:

| harness | clazz |
|---|---|
| claude | native-manifest |
| codex, cursor, kimi, kiro, kiro-ide | folder-drop-auto |
| opencode | manual-only |

## 実装の核 — クラス別 layout(component-methods C3 の 3 分岐)

`installArtifacts(plugin, harness)` は `clazz` の判別 union switch 1 箇所(scalability-design: 面数が増えても分岐数はクラス数 3 で一定):

- **native-manifest(claude)**: `claudeInstallArtifacts` が担う。`.claude-plugin/plugin.json`(marketplace metadata)+ `hooks/hooks.json`(auto-compose snippet)+ `plugins/<name>/<rel>`(claude-transformed 内容)+ **`INSTALL.md`(marketplace 様式 — マトリクス install_artifacts に忠実、§12a Major 2 是正)**。
- **folder-drop-auto**: `plugins/<name>/<rel>`(harness-transformed 内容)+ `hooks/auto-compose.snippet`(harnessDir トークン置換済み compose recipe)+ `INSTALL.md`(手順書)。
- **manual-only(opencode)**: `plugins/<name>/<rel>` + `INSTALL.md`(手動 compose 1 コマンド明記、hook snippet なし — silent skip 禁止だが投影ゼロにはしない: layout=手順書は生成)。

### 面/クラスの所有境界(U3 ⇄ U4 deconflict)

U4(hook-wiring-remaining)の FD で「投影(U3)がフック snippet を配布し、U4 が wiringPoint へ HookInvocation を配線」と分界済み。よって U3 は **harness-neutral な auto-compose recipe snippet を配布**するのみで、harness-native な設定形式(codex config.toml trust / kiro agents.json / kimi toml 等)への埋め込み=U4。domain-entities の layout は「hook snippet の**有無**」をクラスで決めると規定(形式ではない)。これに従い U3 は presence をクラスで決め、内容は tokenized compose recipe とする。marketplace metadata は native-manifest クラスのみ(BR-U3-6 の未実測面非確約 — deferred セルは投影対象外)。

## write⇔check 対称(REL-U3-2 / BR-U3-5)

- `pluginBundleExpected(pluginsRoot, io): Map<path,bytes>` を **write と check の単一ソース**とする(verbatim neutral 内容 + 全 7 install bundle)。`scripts/package.ts` の `writeNeutralBundle` / `checkNeutralBundle` は本関数へ委譲。
- `computeProjectionHash(bytes): string`(sha256 hex)を check の比較プリミティブとして `checkPluginProjections` 内で消費する(未消費フィールドを作らない — 検証劇場 Forbidden)。
- `checkPluginProjections(pluginsRoot, distRoot, io): DriftEntry[]`(`{ kind: "stale" | "orphan"; path }`)を新設し、`package.ts` の neutral bundle 検査経路がこれを消費する。二重の検査経路は作らない。

## OutDirRefusal(BR-U3-3 / SEC-U3-1、上流 t188 #27-32 と 1:1)

`classifyOutDir(outDir, probe): OutDirVerdict` を **fs 非依存の純関数**とする(parse-don't-validate):

- `OutDirProbe = { lstatKind: "missing"|"dir"|"file"|"symlink"|"broken-symlink"; isPriorProjection: boolean; isForeign: boolean; dirNonEmpty: boolean }`
- 拒否: `non-projection-nonempty-dir`(#27)/ `foreign-projection`(#28)/ `file-outdir`(#29 生 ENOTDIR stack 抑止)/ `symlink-outdir`(#30)/ `broken-symlink-outdir`(#31)
- ok: missing / 空 dir / 真正な先行投影(#32 — isPriorProjection=true)
- `projectPluginForHarness`(install flow)は lstat から `OutDirProbe` を構成し、`refused` なら 1 行 usage エラーで throw(生 stack 抑止)・書込ゼロ。`ok` なら install bundle + 先行投影マーカー(`.amadeus-plugin-projection.json` = `{plugin,harness}`、存在=isPriorProjection、plugin/harness 不一致=foreign)を書く。マーカーは **install 先ディレクトリにのみ**書き dist bundle には含めない(dist bundle marker-free)。
- **本番書込経路の配線(§12a Major 1 是正)**: `scripts/package.ts` の `writeNeutralBundle` は clean-sweep 前に `assertInstallOutDirsSafe(pluginsRoot, distRoot)` を呼ぶ。dist/plugins/<name>/<harness>/ が symlink/file/broken-symlink のとき `classifyOutDir` 経由で write-0 拒否。dist は generator 所有のため plain dir=先行投影(上書き可)。落ちる実証は t312 で本番経路(writeNeutralBundle)に対して固定。

## 部分失敗 loud(REL-U3-3 / BR-U3-8)

`projectPluginForHarness` は面単位。上位(package.ts の面ループは既存の per-harness 収集済み)。本 Unit の投影ループの失敗収集は既存 package.ts の面別ループ+`checkPluginProjections` の DriftEntry 列挙で loud 化。

## 変更ファイル(正本のみ — dist/self-install は生成物)

- `scripts/plugin-projection.ts`: 型追加(`PluginHostClass`/`HarnessProjectionSpec`/`OutDirProbe`/`OutDirVerdict`/`OutDirRefusal`/`DriftEntry`)、`PLUGIN_HOST_CLASS` map、`installArtifacts`、`classifyOutDir`、`assertInstallOutDirsSafe`(本番経路 guard)、`computeProjectionHash`、`checkPluginProjections`、`pluginBundleExpected`、`projectPluginForHarness` 一般化、`claudeInstallArtifacts` に INSTALL.md 追加、marker helper、INSTALL/snippet builder。
- `scripts/package.ts`: `writeNeutralBundle` に `assertInstallOutDirsSafe` 配線、`neutralBundleExpected`/`checkNeutralBundle` の委譲。
- `scripts/package.ts`: `neutralBundleExpected`→`pluginBundleExpected` 委譲、`checkNeutralBundle`→`checkPluginProjections` 委譲。
- `dist/plugins/<name>/<harness>/`(生成物): `bun scripts/package.ts` で全 7 面 install bundle 再生成。

## テスト(t304-t312 予約枠、in-process seam 駆動 — spawn 盲点回避)

- **unit(純関数)**: t304 `classifyOutDir` probe 全列挙(拒否 5 + ok 3 経路)、t305 `computeProjectionHash` 決定性、t306 `PLUGIN_HOST_CLASS` の U1 マトリクス転記照合(7 面クラス)。
- **integration(実 FS)**: t307 `installArtifacts` の 3 クラス layout(marketplace + INSTALL は native-manifest、folder-drop-auto に snippet、manual-only に snippet 無し、全クラスに INSTALL 内容)、t308 `projectPluginForHarness` 全 7 面 happy write + marker、t309 OutDirRefusal 全ケース fixture 対照(#27-32)+ 先行投影 re-project 許可(両側実測)、t310 `checkPluginProjections` stale/orphan 両側の落ちる実証、t311 0-plugin byte-identical、**t312 `writeNeutralBundle` 本番経路の OutDirRefusal 落ちる実証**。
- **既存ゲート**: t303(U2 claude seam)を一般化に追随して更新(non-claude が throw しなくなるため該当 assert を全 7 面 happy へ)。dist:check / promote:self:check の drift ガード。

## 検証コマンド(全て同期・exit code 個別記録)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` / coverage lcov 照合(fork 4ea02e41a diff 追加行 DA:0=0)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T01:41:18Z
- **Iteration:** 1
- **Scope decision:** none

OutDirRefusal(BR-U3-3/SEC-U3-1)の実装は本番書込経路に配線されておらずFR-2合否3が未充足、かつclaudeのINSTALL_doc除外がBR-U3-2の転記のみ規則に反する無申告(未選挙)逸脱

### Findings

- [Major] projectPluginForHarness(scripts/plugin-projection.ts:576-593、classifyOutDirを呼ぶ唯一の関数)は scripts/package.ts のどこからも呼ばれていない(repo全域grep実測: scripts/, packages/ 配下でtest以外の呼出し元0件)。実際の書込経路 writeNeutralBundle(scripts/package.ts:798-810)は pluginBundleExpected→installArtifacts で得たbytesを rmSync(distPlugins,{recursive:true,force:true}) の全面clean-sweep後に mkdirSync+writeFileSync で直接書き込んでおり、classifyOutDir/probeOutDirによるOutDirRefusal判定を一切経由しない。application-design/decisions.md:61 のADRは『outDir安全性は上流#27-32と同等の拒否集合...を実装』と dist/plugins/<name>/<harness>/ への書込を対象に明記しており、requirements.md:29 のFR-2合否3(『出力先の安全性...の拒否』)もこの経路を指す。t304/t308/t309はclassifyOutDir/projectPluginForHarnessを直接呼ぶ単体・統合テストで green だが、それは孤立した公開関数への到達を実証するのみで、`bun scripts/package.ts`(CI/実ビルドが唯一実行する経路)がこの安全策を一切通らないことは検証されていない。amadeus-plugin.ts のCLI(compose/drop/doctor/status)にもinstall系サブコマンドは無く、projectPluginForHarnessを呼ぶ本番呼出し元は現状ゼロ。結果としてFR-2合否3・BR-U3-3は本番動作としては未充足(テストのみが到達する検証劇場に近い状態)。
- [Major] BR-U3-2(business-rules.md:8)は『投影対象面とクラスはU1マトリクスの機械可読列挙(BR-U1-7)からの転記のみ。FD・実装での面の追加/除外判断を禁止』と明記するが、harness-capability-matrix.md:224 の bolt3_projection_targets は claude の install_artifacts を [plugin_content, marketplace_metadata, hooks_snippet, INSTALL_doc] と確定しているのに対し、claudeInstallArtifacts(scripts/plugin-projection.ts:328-343、U2から不変)は INSTALL.md を生成せず、t307(tests/integration/t307-install-artifacts-classes.integration.test.ts:33-39)がこの欠落を『claude projector unchanged (U2)』として意図的に固定している。code-summary.md の『逸脱・特記』項2でこれをFDの『残面の layout 分岐を追加』という一文からの builder 独自解釈として自己申告しているが、team.md の cid:code-generation:deviation-stop-before-implement(逸脱は実装前に停止して選挙裁定を得る)を経ておらず、マトリクス転記のみを義務付けるBR-U3-2に反する無申告(未選挙)の面/成果物除外判断である。business-logic-model.md 側のFDレビューもこの除外を明示指摘・裁定した記録がない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T01:41:18Z
- **Iteration:** 2
- **Scope decision:** none

両 Major が実測で閉包。OutDirRefusal は writeNeutralBundle の本番経路へ配線され t312 が実経路で赤/緑を実証、claude 面は BR-U1-7 に忠実な INSTALL.md を生成し t307 で固定、dist:check/対象テストとも green。

### Findings

- None
