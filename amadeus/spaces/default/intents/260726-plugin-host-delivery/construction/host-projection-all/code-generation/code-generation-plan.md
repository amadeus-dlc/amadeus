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

- **native-manifest(claude)**: 既存 `claudeInstallArtifacts` へ委譲し **不変**(business-logic-model「U2 の claude projector は変更せず」/ REL-U3-1 の U3 先行順序前提)。`.claude-plugin/plugin.json`(marketplace metadata)+ `hooks/hooks.json`(auto-compose snippet)+ `plugins/<name>/<rel>`(claude-transformed 内容)。
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
- `projectPluginForHarness` は lstat から `OutDirProbe` を構成し、`refused` なら 1 行 usage エラーで throw(生 stack 抑止)・書込ゼロ。`ok` なら install bundle + 先行投影マーカー(`.amadeus-plugin-projection.json` = `{plugin,harness}`、存在=isPriorProjection、plugin/harness 不一致=foreign)を書く。マーカーは **install 先ディレクトリにのみ**書き dist bundle には含めない(claude byte-identity と dist bundle marker-free を保つ)。

## 部分失敗 loud(REL-U3-3 / BR-U3-8)

`projectPluginForHarness` は面単位。上位(package.ts の面ループは既存の per-harness 収集済み)。本 Unit の投影ループの失敗収集は既存 package.ts の面別ループ+`checkPluginProjections` の DriftEntry 列挙で loud 化。

## 変更ファイル(正本のみ — dist/self-install は生成物)

- `scripts/plugin-projection.ts`: 型追加(`PluginHostClass`/`HarnessProjectionSpec`/`OutDirProbe`/`OutDirVerdict`/`OutDirRefusal`/`DriftEntry`)、`PLUGIN_HOST_CLASS` map、`installArtifacts`、`classifyOutDir`、`computeProjectionHash`、`checkPluginProjections`、`pluginBundleExpected`、`projectPluginForHarness` 一般化、marker helper、INSTALL/snippet builder。
- `scripts/package.ts`: `neutralBundleExpected`→`pluginBundleExpected` 委譲、`checkNeutralBundle`→`checkPluginProjections` 委譲。
- `dist/plugins/<name>/<harness>/`(生成物): `bun scripts/package.ts` で全 7 面 install bundle 再生成。

## テスト(t304-t312 予約枠、in-process seam 駆動 — spawn 盲点回避)

- **unit(純関数)**: t304 `classifyOutDir` probe 全列挙(拒否 5 + ok 3 経路)、t305 `computeProjectionHash` 決定性、t306 `PLUGIN_HOST_CLASS` の U1 マトリクス転記照合(7 面クラス)。
- **integration(実 FS)**: t307 `installArtifacts` の 3 クラス layout(marketplace は native-manifest のみ・folder-drop-auto に snippet・manual-only に snippet 無し・全クラスに INSTALL 内容)、t308 `projectPluginForHarness` 全 7 面 happy write + marker、t309 OutDirRefusal 全ケース fixture 対照(#27-32)+ 先行投影 re-project 許可(両側実測 — 正当な既存投影で赤くならない)、t310 `checkPluginProjections` stale/orphan 両側の落ちる実証、t311 0-plugin byte-identical(pluginBundleExpected 空)。
- **既存ゲート**: t303(U2 claude seam)を一般化に追随して更新(non-claude が throw しなくなるため該当 assert を全 7 面 happy へ)。dist:check / promote:self:check の drift ガード。

## 検証コマンド(全て同期・exit code 個別記録)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` / coverage lcov 照合(fork 4ea02e41a diff 追加行 DA:0=0)。
