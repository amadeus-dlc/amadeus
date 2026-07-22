# リバースエンジニアリング per-intent scan note: 260722-tla-plugin

## 実行メタデータ

- Date: 2026-07-22(Asia/Tokyo)
- Observed at: HEAD `a5bb93df11ac759a9e0cf96de64103d7a32d3199`(現 HEAD)
- Intent: `260722-tla-plugin`(TLA+ 形式検証の常設化 — `formal-model-check` ステージを plugins/ 供給で追加し、`.tla` 外部化・`run-model-check.ts` 一般化・`ci.yml` 統合・モデル⇔実装対応の完備性 sensor を実現する)
- Scope: `amadeus`(Depth Standard / Test Strategy Comprehensive)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`a326f47bc0146a3b4285552f42b92fd61fb343a7`(全 `re-scans/*.md` observed のうち HEAD 祖先で距離最小)。`git merge-base --is-ancestor a326f47bc a5bb93df` **exit 0 実測**、距離 `git rev-list --count a326f47bc..a5bb93df`=**96**。日付が新しい非祖先 observed(`545e69c` / `1865bc9` / `3e34946` / `f6ab1e4` / `37f8cf5` / `262a86d` / `6f2455c`)はいずれも `--is-ancestor` exit 1(並行 intent の squash tip)で base 候補から構造的に除外(cid:reverse-engineering:rescan-base-ancestry / re-timestamp-merge-resolution)。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `a5bb93df` のワークツリー実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(96コミット・2572 files `+349,527/−5,266`)はコマンド出力からの転記(numbers-from-command-output-only)。

区間 `a326f47bc..a5bb93df`=96コミット・2572 files `+349,527/−5,266`。うち本 intent のフォーカス正本への変更は次の通り: **formal-verif 実験装置** 6コミット・36 files `+9,342`(全新規)、**plugin 供給機構** 1コミット・2 files `+1,667`(全新規)、**sensor** 変更0、`ci.yml` 2コミット、`formal-verification.yml` 1コミット。ランドマーク = `0b1255e05`(upstream-sync v2.3.0、plugin 機構導入)、`167a229c3`(formal-verif 実験装置 U1〜U8)、`f1c8bea0a`(two-layer posture)、`fbbb6e3f5` / `3c5b948a0`(PBT オラクル相殺・適格性レポート TLA 7/7 vs PBT 3/7)。この区間で upstream-sync-230 が MISSING と判定した plugin discovery/projection(item 18-22)は**実装済みへ遷移**し、formal-verif は experiment 装置として着地した。

## フォーカス面知見

### formal-verif 実験装置(新規 — codekb 未反映領域)

- **`scripts/amadeus-tlc-toolchain.ts`**(44KB、純ドメイン): `parseTlcOutput174`(:533)、`createTlcRunManifest`(:770)、`FIXED_TLC_PROFILE`(:31)、`FIXED_JDK_RUN_PROFILE`(:47)、`DARWIN_SANDBOX_PROVIDER_IDENTITY`(:91)、`MAX_TLC_STREAM_BYTES`=16MB(:101)。TLC 終局分類: `COMPLETE`→`NOT_DETECTED` / それ以外→`HARNESS_ERROR`(fail-closed、有限探索の固定点完走のみ NOT_DETECTED を許す — cid:application-design:finite-exploration-not-detected-proof に整合)。
- **`scripts/amadeus-fs-tlc-toolchain.ts`**(82KB、FS/spawn 表層): `class DarwinSandboxExecProvider`(:380、`sandbox-exec` spawn :402)、`prepare`(:1220)/`run`(:1255)の issue 検証、プリスポーンドリフト検証(:1263-1278、`SOURCE_DRIFT` / `JDK_DRIFT` / `JDK_VERSION_DRIFT` / `SANDBOX_DRIFT`)、`spawn`(:1291)、`normalize`(:1422)。fail-closed 終局(:77-79)。
- **`scripts/formal-verif/tla-arm.ts`**(36KB): `MODEL_SOURCE` 埋め込み(:329 `---- MODULE FormalElection ----`)、`CFG_SOURCE`(:641)、identity tag `amadeus.formal-verif.tla.module.v1`(:720) / `.cfg.v1`(:724) / `.bundle.v1`(:772)、`invariantMap`(:759)、`generateFrozenTlaModel` / `createFrozenTlaModelReceipt`。モデルは **FormalElection 1本のみ**(埋め込み — 本 intent の `.tla` 外部化対象)。
- **`scripts/run-skeleton-ci.ts`**(7.3KB): D4 固定・2run 決定性・skeleton 専用ハードコード(`subjectAlias "fx-1252"` :119、`suiteRemainingMs 150_000` :101、`deadline 120_000` :120)。**`run-model-check.ts` は不在** — 本 intent の一般化対象。

### plugin 供給機構(新規 — codekb 未反映領域)

- **`plugin-composition.ts`**(51KB): `SEAM_NAMES`=`["produces","consumes","sensors","required_sections"]`(:45)、`discoverPlugins`(:219)、`inspectPlugin`(:341)、`WorkspaceTransaction`(:660〜、journal + preimage recovery :717 / :763 / :770 / :800)、`PluginErrorKind`(:154)。
- **`plugin-projection.ts`**(18.5KB): repo-root `plugins/<name>/` → 6ハーネス dist + 中立バンドル、`{{HARNESS_DIR}}` 書換(:252)、ホストプレフィクス `posix.join("plugins", name)`(:142)。
- fixture: `tests/fixtures/plugins/test-pro/`。repo-root `plugins/` は**意図的不在**(0-plugin baseline は byte-identical、`t254:14-16`)。

### 【P0 ギャップ確定】plugin ステージ → engine 実行経路は未接続

- `compileStageGraph` の walk は `amadeus-common/stages/<phase>/*.md` のみ(`amadeus-graph.ts:1690-1694`、`stagesDir=DEFAULT_STAGES_DIR` :174 or `AMADEUS_STAGES_DIR` :181-184)。
- `graph` / `orchestrate` / `lib` に plugins ステージ発見の参照は**ゼロ**(grep 実測 — `graph.ts` コメント :1646 のみ)。
- compose 投影先(`plugins/<name>/` または `t254` の flat `stages/`)は walk 対象と**不一致**(`plugin-composition.ts:494`、`parseStages:286`、`t254:154`)。
- `t254` の verify は**スタブ**(`t254:167`)— engine 解決を証明していない。
- 解決候補: (a) walk 拡張 (b) compose 投影先を phase-nested へ (c) `formal-model-check` をコアステージ化し plugin は seam 寄与のみ。

### sensors シームの制約

- sensors シームは frontmatter への id 文字列追加のみ(:440 / :1052)。manifest(`.claude/sensors/amadeus-<id>.md`)と実装(`.ts`)は**運ばれない**。
- 未知 sensor id は graph compile が **loud reject**(`graph.ts:719`、`SENSOR_FILE_REGEX` :650)。本 intent の完備性 sensor は manifest+実装を別経路で供給する必要がある。

### CI

- `ci.yml`: `push` + `pull_request`、jobs=`changes`(:32) / `check`(:77) / `coverage-head`(:125) / `coverage-base`(:185)、全 `ubuntu-latest`。
- `formal-verification.yml`: `workflow_dispatch` のみ(:11-12)、`macos-15`、JDK 26.0.1 grep、D4 パッチ適用 → `run-skeleton-ci.ts`。PR CI とは分離(FR-0 意図との乖離 — 常設化の対象)。

## ideation 裁定(文脈情報)

- CI は **Linux + 既成 Docker イメージ digest 固定**(ユーザー裁定 — `sandbox-exec` は CI 不要、provider 抽象化が必要)。
- 供給形態は **plugins/ バンドル**。
- 完備性 sensor は**モデル⇔実装対応ドリフト検出**。
- モデルは **FormalElection 1本のみ**。

## Delivery boundary

- 実装・修正コード、`.tla` 外部化、`ci.yml` 統合、`bun scripts/package.ts` / `promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。
- 本 scan は観測のみ。区間には plugin 機構(2 files)・formal-verif 装置(36 files)の新規追加があり、その現行断面から常設ステージ化の接続点(P0 ギャップ)と一般化対象(`run-model-check.ts` 不在、`.tla` 埋め込み、sensors id-only シーム)を確定した。
