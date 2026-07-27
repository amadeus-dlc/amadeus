# Code Summary — U3 host-projection-all

> 上流入力(consumes 全数): functional-design/business-logic-model、functional-design/business-rules、functional-design/domain-entities、nfr-design/logical-components、nfr-design/performance-design、nfr-design/security-design、nfr-design/reliability-design、nfr-design/scalability-design、units-generation/unit-of-work(U3 行)、requirements-analysis/requirements(FR-2)、harness-capability-matrix/code-generation/harness-capability-matrix(BR-U1-7 機械可読列挙)

## 実装概要

U2 の claude 専用 install bundle 投影を、U1 マトリクスで確定した全 7 面へ一般化した。クラス別 3 分岐(`native-manifest` / `folder-drop-auto` / `manual-only`)+ OutDirRefusal 全集合(上流 t188 #27-32)+ `--check` stale/orphan 編入 + 0-plugin byte-identical を実装。native-manifest(claude)面はマトリクス install_artifacts に忠実に marketplace metadata + hooks snippet + plugin content + **INSTALL_doc** を生成する(§12a Major 2 是正)。

### §12a レビュー是正(iteration 1 NOT-READY → 是正)
- **Major 1(OutDirRefusal 未配線)**: `classifyOutDir` を本番書込経路 `writeNeutralBundle` へ `assertInstallOutDirsSafe` 経由で配線。dist/plugins/<name>/<harness>/ が symlink/file/broken-symlink の場合、clean-sweep が追従/破壊する前に write-0 で拒否。落ちる実証を t312 で実経路(writeNeutralBundle + temp AMADEUS_DIST_ROOT)に対して固定。
- **Major 2(claude INSTALL_doc 欠落の無申告逸脱)**: マトリクス(BR-U1-7/BR-U3-2 転記のみ)に忠実に claude へ INSTALL.md を追加(marketplace 様式)。t307 の固定を更新。既決 contract への機械的復帰(選挙不要 — leader 裁定)。

## 変更・追加ファイル(正本+生成物)

### 正本
- `scripts/plugin-projection.ts`(M): 以下を追加/一般化
  - 型: `PluginHostClass`、`HarnessProjectionSpec`、`OutDirRefusal`、`OutDirVerdict`、`OutDirProbe`、`DriftEntry`
  - `PLUGIN_HOST_CLASS`(BR-U1-7 転記の const map)、`harnessProjectionSpec(harness)`
  - `classifyOutDir(probe)`(fs 非依存の純関数 — SEC-U3-1 層 1)、`lstatKindOf`/`probeOutDir`(fs 端の probe 構成)、`refusalMessage`(1 行 usage、生 stack 抑止)
  - `assertInstallOutDirsSafe(root, distRoot, io)`(**Major 1 是正 — 本番書込経路の guard**): 各 per-harness install outDir を classifyOutDir で検査。dist は generator 所有のため plain dir=先行投影(上書き可)、symlink/file/broken-symlink=拒否。PluginValidationError(write-0)
  - 先行投影マーカー `.amadeus-plugin-projection.json`(install 先=projectPluginForHarness のみに書く。dist は marker-free で plain dir=先行投影。存在=isPriorProjection、plugin/harness 不一致=foreign)
  - `installArtifacts(plugin, harness)`(3 クラス switch。native-manifest は `claudeInstallArtifacts` へ委譲)、`installDoc`(3 クラス分岐 — native-manifest は marketplace 様式)、`autoComposeSnippet`、`code`(markdown code span helper)
  - `claudeInstallArtifacts`(M): **INSTALL.md 追加(Major 2 是正)**
  - `projectPluginForHarness` を全 7 面へ一般化(U2 の "only claude" throw 撤廃)
  - `computeProjectionHash(bytes)`(sha256 — write⇔check 単一比較プリミティブ)、`pluginBundleExpected`(write/check 単一ソース)、`checkPluginProjections`(DriftEntry[] stale/orphan)
  - `claudeMarketplaceManifest`: ネストしたテンプレートリテラルを分解(出力 byte 不変)。詳細は「逸脱・特記」参照
- `scripts/package.ts`(M): `writeNeutralBundle` に `assertInstallOutDirsSafe` を配線(clean-sweep 前の plan 段 guard)、`neutralBundleExpected`→`pluginBundleExpected` 委譲、`checkNeutralBundle`→`checkPluginProjections` 委譲(既存の MISSING/DIFFERS/ORPHAN メッセージ語彙は保持)

### テスト(t304-t311 予約枠使用、in-process seam 駆動)
- `tests/unit/t304-classify-outdir.test.ts`(small・pure): `classifyOutDir` 拒否 5 + ok 3 経路
- `tests/unit/t305-projection-hash.test.ts`(small・pure): `computeProjectionHash` 決定性・byte 感度・様式
- `tests/unit/t306-plugin-host-class.test.ts`(small・pure): `PLUGIN_HOST_CLASS` の U1 マトリクス転記照合
- `tests/integration/t307-install-artifacts-classes.integration.test.ts`(medium): 3 クラス layout(marketplace は native-manifest のみ・folder-drop-auto に snippet・manual-only に snippet 無し・トークン置換)
- `tests/integration/t308-project-all-harnesses.integration.test.ts`(medium): 全 7 面 happy write + marker + 先行投影 re-project 許可(#32)+ foreign 拒否(#28)
- `tests/integration/t309-outdir-refusal.integration.test.ts`(medium): 実 FS の #27/#29/#30/#31 拒否(write-0 実測)+ 両側実測(空 dir / 不在 dir は非拒否)
- `tests/integration/t310-check-plugin-projections.integration.test.ts`(medium): stale(byte 改変・削除)/ orphan(余剰ファイル)の落ちる実証
- `tests/integration/t311-zero-plugin-byte-identical.integration.test.ts`(medium): 0-plugin で `pluginBundleExpected` 空・drift 0・dist/plugins 非作成
- `tests/integration/t312-writebundle-outdir-refusal.integration.test.ts`(medium・**Major 1 落ちる実証**): 本番経路 `writeNeutralBundle`(temp AMADEUS_DIST_ROOT)で per-harness install outDir が symlink/file/broken-symlink のとき write-0 拒否 + plain-dir rebuild は許容
- `tests/integration/t307`(M・**Major 2**): claude の INSTALL.md 保有と marketplace 様式を固定
- `tests/integration/t303-plugin-projection-harness.integration.test.ts`(M): U2 の "only claude" guard テストを folder-drop-auto happy write へ更新(一般化に追随)

### 生成物
- `dist/plugins/formal-model-check/<harness>/`(6 面新規: codex/cursor/kimi/kiro/kiro-ide/opencode の install bundle)+ claude 面に INSTALL.md 追加(Major 2)。`bun scripts/package.ts`(全 7 ハーネス)で再生成。

## 検証コマンドと exit code(全て同期実行)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bash tests/run-tests.sh --ci` | RESULT: PASS(Failed files: 0 / Failed assertions: 0) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0(baseline 不変 — 根本原因を修正) |
| lcov DA 照合(fork 4ea02e41a diff 追加行) | plugin-projection.ts: instrumented-added 186 中 DA:0 = 0 / package.ts: instrumented-added 10 中 DA:0 = 0 |

- 上記は §12a 是正後の再実測値(全ゲート再実行)。
- `bash tests/run-tests.sh --ci` の wall-clock drift 2 件(`t-codex-hooks-migration`、`t225-upstream-v2-migration-preflight`)は既存・自変更外(RESULT: PASS の非ブロッキング注記)。
- coverage:ci フル実行はホスト上で 9 分超のためタイムアウトしたため、U3 コードを駆動するテスト群(t303-t312 + packaging + t299 CLI)に絞って lcov を生成し、fork 4ea02e41a との diff 追加行の DA:0 = 0 を直読で実測した。

## 逸脱・特記(レビュー観点)

1. **U3/U4 所有境界の解釈**: domain-entities の layout は「hook snippet の**有無**」をクラスで決めると規定(形式ではない)。U4 FD が「投影(U3)がフック snippet を配布 → U4 が wiringPoint へ配線」と分界済み。よって U3 は harness-neutral な auto-compose recipe snippet(`hooks/auto-compose.snippet`)を配布するのみとし、harness-native な設定形式(codex config.toml trust / kiro agents.json / kimi toml)への埋め込みは U4 に委ねた。U1 マトリクス install_artifacts の per-harness 形式差(trust_hash_recipe 等)= U4 の配線対象と解釈。これは設計の抽象(「hook snippet」)を U4 の明示所有で解決した builder 解釈であり、設計と矛盾しない。

2. **(是正済み — §12a Major 2)** 当初 claude 面を byte-identical 維持のため INSTALL_doc 非追加としていたが、これはマトリクス(BR-U1-7/BR-U3-2 転記のみ)からの無申告逸脱と裁定された。マトリクスに忠実に claude へ INSTALL.md(marketplace 様式)を追加。claude bundle はもはや byte-identical ではないが、0-plugin byte-identical(BR-U3-4)は不変(0-plugin では bundle 自体が空)。

3. **OutDirRefusal の本番経路配線(§12a Major 1 是正)**: 当初 `classifyOutDir` は install flow の `projectPluginForHarness` のみが消費し本番 dist 書込経路 `writeNeutralBundle` を経由しなかった。ADR-5/FR-2 合否3 に従い `assertInstallOutDirsSafe` を `writeNeutralBundle` の clean-sweep 前に配線。dist は generator 所有のため plain dir=先行投影(上書き可)、symlink/file/broken-symlink のみ拒否(clean-sweep が追従/破壊する前に write-0)。marker ベースの foreign/非投影検出は install flow(projectPluginForHarness)側で全集合を担う。落ちる実証 t312。

4. **`claudeMarketplaceManifest` の behavior-preserving refactor(U2 関数に接触)**: 私の新コードを追加したところ複雑度ゲートが `claudeMarketplaceManifest` を CCN 24 の NEW_VIOLATION として偽検出した。lizard が同関数をマージ検出していたのが原因で、fork 時点から潜在(fork では 301-347 マージ・CCN 3 で閾値下)。原因は同関数のネストしたテンプレートリテラルが lizard の関数境界スキャナを desync させること。**出力 byte を変えずに**内側テンプレートを別文へ分解し、`installDoc` 内のバッククォートも `String.fromCharCode(96)` helper 経由に統一して lizard スキャナを再同期した。複雑度 baseline は更新せず(偽検出のため — complexity-baseline-ordinal の趣旨)。U2 関数への接触は本 desync 是正に限定。

5. **state.md / audit shard は未コミット**: `amadeus-state.md`(Bolt Refs / Worktree Path)と per-clone audit shard の変更は swarm 化ツール由来であり、builder は state 変更禁止のため conductor に委ねる(コミットに含めない)。

6. write⇔check 対称は単一ソース `pluginBundleExpected`(write と check が共有)+ `computeProjectionHash`(check の比較プリミティブとして消費)で実現し、未消費フィールド(検証劇場)を作っていない。
