# Code Summary — U3 host-projection-all

> 上流入力(consumes 全数): functional-design/business-logic-model、functional-design/business-rules、functional-design/domain-entities、nfr-design/logical-components、nfr-design/performance-design、nfr-design/security-design、nfr-design/reliability-design、nfr-design/scalability-design、units-generation/unit-of-work(U3 行)、requirements-analysis/requirements(FR-2)、harness-capability-matrix/code-generation/harness-capability-matrix(BR-U1-7 機械可読列挙)

## 実装概要

U2 の claude 専用 install bundle 投影を、U1 マトリクスで確定した全 7 面へ一般化した。クラス別 3 分岐(`native-manifest` / `folder-drop-auto` / `manual-only`)+ OutDirRefusal 全集合(上流 t188 #27-32)+ `--check` stale/orphan 編入 + 0-plugin byte-identical を実装。claude projector は byte-identical のまま不変(`dist/plugins/formal-model-check/claude/` は fork 4ea02e41a と diff 空を実測)。

## 変更・追加ファイル(正本+生成物)

### 正本
- `scripts/plugin-projection.ts`(M): 以下を追加/一般化
  - 型: `PluginHostClass`、`HarnessProjectionSpec`、`OutDirRefusal`、`OutDirVerdict`、`OutDirProbe`、`DriftEntry`
  - `PLUGIN_HOST_CLASS`(BR-U1-7 転記の const map)、`harnessProjectionSpec(harness)`
  - `classifyOutDir(probe)`(fs 非依存の純関数 — SEC-U3-1 層 1)、`probeOutDir`(fs 端の probe 構成)、`refusalMessage`(1 行 usage、生 stack 抑止)
  - 先行投影マーカー `.amadeus-plugin-projection.json`(install 先のみに書く。存在=isPriorProjection、plugin/harness 不一致=foreign)
  - `installArtifacts(plugin, harness)`(3 クラス switch。native-manifest は既存 `claudeInstallArtifacts` へ委譲=不変)、`installDoc`、`autoComposeSnippet`、`code`(markdown code span helper)
  - `projectPluginForHarness` を全 7 面へ一般化(U2 の "only claude" throw 撤廃)
  - `computeProjectionHash(bytes)`(sha256 — write⇔check 単一比較プリミティブ)、`pluginBundleExpected`(write/check 単一ソース)、`checkPluginProjections`(DriftEntry[] stale/orphan)
  - `claudeMarketplaceManifest`: ネストしたテンプレートリテラルを分解(出力 byte 不変)。詳細は「逸脱・特記」参照
- `scripts/package.ts`(M): `neutralBundleExpected`→`pluginBundleExpected` 委譲、`checkNeutralBundle`→`checkPluginProjections` 委譲(既存の MISSING/DIFFERS/ORPHAN メッセージ語彙は保持)

### テスト(t304-t311 予約枠使用、in-process seam 駆動)
- `tests/unit/t304-classify-outdir.test.ts`(small・pure): `classifyOutDir` 拒否 5 + ok 3 経路
- `tests/unit/t305-projection-hash.test.ts`(small・pure): `computeProjectionHash` 決定性・byte 感度・様式
- `tests/unit/t306-plugin-host-class.test.ts`(small・pure): `PLUGIN_HOST_CLASS` の U1 マトリクス転記照合
- `tests/integration/t307-install-artifacts-classes.integration.test.ts`(medium): 3 クラス layout(marketplace は native-manifest のみ・folder-drop-auto に snippet・manual-only に snippet 無し・トークン置換)
- `tests/integration/t308-project-all-harnesses.integration.test.ts`(medium): 全 7 面 happy write + marker + 先行投影 re-project 許可(#32)+ foreign 拒否(#28)
- `tests/integration/t309-outdir-refusal.integration.test.ts`(medium): 実 FS の #27/#29/#30/#31 拒否(write-0 実測)+ 両側実測(空 dir / 不在 dir は非拒否)
- `tests/integration/t310-check-plugin-projections.integration.test.ts`(medium): stale(byte 改変・削除)/ orphan(余剰ファイル)の落ちる実証
- `tests/integration/t311-zero-plugin-byte-identical.integration.test.ts`(medium): 0-plugin で `pluginBundleExpected` 空・drift 0・dist/plugins 非作成
- `tests/integration/t303-plugin-projection-harness.integration.test.ts`(M): U2 の "only claude" guard テストを folder-drop-auto happy write へ更新(一般化に追随)

### 生成物
- `dist/plugins/formal-model-check/<harness>/`(6 面新規: codex/cursor/kimi/kiro/kiro-ide/opencode の install bundle)。`bun scripts/package.ts`(全 7 ハーネス)で再生成。claude 面は byte-identical。

## 検証コマンドと exit code(全て同期実行)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bash tests/run-tests.sh --ci` | RESULT: PASS(Failed files: 0 / Failed assertions: 0) |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0(baseline 不変 — 根本原因を修正) |
| lcov DA 照合(fork 4ea02e41a diff 追加行) | plugin-projection.ts: instrumented-added 165 中 DA:0 = 0 / package.ts: instrumented-added 9 中 DA:0 = 0 |

- `bash tests/run-tests.sh --ci` の wall-clock drift 2 件(`t-codex-hooks-migration`、`t225-upstream-v2-migration-preflight`)は既存・自変更外(RESULT: PASS の非ブロッキング注記)。
- coverage:ci フル実行はホスト上で 9 分超のためタイムアウトしたため、U3 コードを駆動するテスト群(t303-t311 + packaging + t299 CLI)に絞って lcov を生成し、fork 4ea02e41a との diff 追加行の DA:0 = 0 を直読で実測した。

## 逸脱・特記(レビュー観点)

1. **U3/U4 所有境界の解釈**: domain-entities の layout は「hook snippet の**有無**」をクラスで決めると規定(形式ではない)。U4 FD が「投影(U3)がフック snippet を配布 → U4 が wiringPoint へ配線」と分界済み。よって U3 は harness-neutral な auto-compose recipe snippet(`hooks/auto-compose.snippet`)を配布するのみとし、harness-native な設定形式(codex config.toml trust / kiro agents.json / kimi toml)への埋め込みは U4 に委ねた。U1 マトリクス install_artifacts の per-harness 形式差(trust_hash_recipe 等)= U4 の配線対象と解釈。これは設計の抽象(「hook snippet」)を U4 の明示所有で解決した builder 解釈であり、設計と矛盾しない。

2. **claude projector 不変の維持**: native-manifest クラスは既存 `claudeInstallArtifacts` へ委譲し INSTALL.md 等を追加しない(business-logic-model「U2 の claude projector は変更せず」)。U1 マトリクスの claude install_artifacts=INSTALL_doc は U3 スコープ外(FD「残面の layout 分岐を追加」)と判断。claude bundle は byte-identical(diff 空を実測)。

3. **`claudeMarketplaceManifest` の behavior-preserving refactor(U2 関数に接触)**: 私の新コードを追加したところ複雑度ゲートが `claudeMarketplaceManifest` を CCN 24 の NEW_VIOLATION として偽検出した。lizard が同関数を 302-491 行(190行)としてマージ検出していたのが原因で、fork 時点から潜在(fork では 301-347 マージ・CCN 3 で閾値下)。原因は同関数 302 行のネストしたテンプレートリテラル(`` `${JSON.stringify({…description: `Amadeus plugin: ${name}`…})}\n` ``)が lizard の関数境界スキャナを desync させること。**出力 byte を変えずに**内側テンプレートを別文へ分解し、私の `installDoc` 内のバッククォートも `String.fromCharCode(96)` helper 経由に統一して lizard スキャナを再同期した。複雑度 baseline は更新せず(偽検出であり実複雑度変化ではないため — complexity-baseline-ordinal の趣旨)。claude bundle 出力は byte-identical。U2 関数への接触は本 desync 是正に限定。

4. **state.md / audit shard は未コミット**: `amadeus-state.md`(Bolt Refs / Worktree Path)と per-clone audit shard の変更は swarm 化ツール由来であり、builder は state 変更禁止のため conductor に委ねる(コミットに含めない)。

5. write⇔check 対称は単一ソース `pluginBundleExpected`(write と check が共有)+ `computeProjectionHash`(check の比較プリミティブとして消費)で実現し、未消費フィールド(検証劇場)を作っていない。
