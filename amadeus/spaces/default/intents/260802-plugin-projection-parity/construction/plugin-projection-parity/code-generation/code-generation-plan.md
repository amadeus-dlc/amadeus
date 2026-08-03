# Code Generation Plan — plugin-projection-parity

## 計画の前提

- 対象は Issue [#2018](https://github.com/amadeus-dlc/amadeus/issues/2018) の corrective `self-fix` であり、新機能やplugin機能本体の変更ではない。
- incremental scope のため `unit-of-work.md`、user stories、application/functional/NFR design は存在しない。単位名は訂正済み要件から `plugin-projection-parity` とし、各Stepを `requirements.md` のFR/NFR/ACへ直接traceする。
- 正常系は、選択済み `formal-model-check` の決定的投影を5 self-install面（Claude、Codex、Cursor、OpenCode、Kimi）へ事前生成してGit管理する。PR #2049のstartup composeは欠損・drift時だけのverify-or-repairとして維持する。
- Codexの正規runnerはproject-root `.agents/skills/amadeus-formal-model-check/SKILL.md` である。`.codex/skills/amadeus-formal-model-check/SKILL.md` は生成・正本化・コミットしない。
- 7 package面（Claude、Codex、Cursor、OpenCode、Kimi、Kiro CLI、Kiro IDE）はneutral／plugin未選択baselineを維持する。Kiro CLI/IDEはpackage-onlyであり、root `.kiro` dogfood投影を追加しない。
- テスト戦略は **Comprehensive**。unit、integration、実Gitを使うE2Eを実装する。性能NFRは存在しないため負荷・性能テストは追加せず、安全性NFRは未管理ファイル保護、閉じたpath、write-0、rollbackのテストで検証する。

## 実装計画

### Step 1: projection matrixとstage entry契約をテストで固定する

- [x] `tests/unit/t-plugin-projection.test.ts`（必要なら同責務の新規unit test）へ、7 package面／5 self-install面、各 `harnessDir`、self-install可否、stage entry destinationをtable-drivenに追加し、まず現行の空 `buildSelfInstallProjection` とCodex誤配置をRedにする。
- [x] `scripts/manifest-types.ts` と `packages/framework/harness/*/manifest.ts`／既存emitterが持つ配置判断を、projectorが消費できるmanifest-owned契約として表現する。第2の手書きdestination表は作らず、Codex `.agents/skills`、Claude/Kimiのnative runner、Cursor/OpenCodeの既存command entry、Kiro 2面のpackage-onlyを1つの閉じた行列から導出する。
- [x] matrixの重複、欠落、未知面、destination衝突、Codex `.codex/skills`、Kiro self-install混入をfail-closedで検出する。

Trace: FR-3、FR-5、FR-6.1、FR-6.5、NFR-4、NFR-5、AC-3、AC-5。

### Step 2: 決定的なself-install projection helperを実装する

- [x] `scripts/plugin-projection.ts` の `buildSelfInstallProjection` を実装し、`amadeus/config.json` の選択、authoring `plugins/<name>/`、harness manifest、既存compose／graph／runnerの正規serializerから、各self-install面の期待ファイル集合を純粋かつcanonical orderで構築する。
- [x] 期待集合へ、選択済みplugin source、合成済みplugin資産、決定的composition record、compiled stage graph、必要なstage entry surfaceを含める。wall-clock、session/clone ID、lock、journal、recovery、TLC結果、plugin audit履歴など実行観測状態は含めない。
- [x] 同一入力の2回生成がbyte-identicalで、plugin未選択時は空の追加集合となるunit testを追加する。source validation失敗はwrite-0、異なるplugin／harnessの所有pathは衝突として拒否する。

Trace: FR-1、FR-2、FR-5.2、FR-7.2〜FR-7.3、NFR-1、NFR-3、NFR-4、NFR-5、AC-1、AC-5。

### Step 3: `promote-self`を5面の生成ownerと厳密drift guardにする

- [x] `scripts/promote-self.ts` の `buildExpected` にStep 2の期待集合を重ね、選択済みself projectionを「既存なら温存」するcarve-outから、生成・byte比較・transactional適用するmanaged surfaceへ変更する。
- [x] `--apply` は5面の不足・stale投影を原子的に更新し、`--check` はMISSING、DIFFERS、ORPHAN、MISPLACEDをharness名とpath付きで非0報告する。Codexの `.codex/skills` はMISPLACED、root `.kiro` plugin projectionは境界違反として扱う。
- [x] managed plugin surfaceだけを削除・更新対象にし、未管理ファイル、別plugin、別harness、既存のpreserved runtime pathを変更しない。事前検証失敗はwrite-0、途中失敗は `DistributionTransactionCoordinator` で開始前bytesへrollbackする。
- [x] 既存Claude面に残る実行履歴系ファイルを決定的投影から分離し、必要なrelation／payload／graph／entryだけを正本化する。

Trace: FR-2.3〜FR-2.4、FR-4.5、FR-6.2〜FR-6.3、NFR-1〜NFR-3、AC-6。Requirements Review FOLLOW-UP（診断、rollback、unmanaged-file保護、orphan/misplacement）を直接充足する。

### Step 4: startup repairのrunner生成をharness-awareにする

- [x] `packages/framework/core/tools/amadeus-plugin.ts` と `packages/framework/core/tools/amadeus-runner-gen.ts` のpost-compose runner経路へ、packaged harnessが供給する正規destinationを渡す。genericな `tools/../skills` 推測をCodexへ適用しない。
- [x] Codex repairでは `.agents/skills/amadeus-formal-model-check/` だけを生成・pruneし、`.codex/skills/` を作らない。Claude/Kimiは既存runner、Cursor/OpenCodeは既存commandから `--stage formal-model-check` を発見できる契約を維持する。
- [x] startupはrecord-currentならwrite-0、欠損・stale時は現在harnessだけを修復し、失敗時はplugin名、harness、失敗段階を既存CLI診断契約で返す。TLCは起動しない。

Trace: FR-3.1〜FR-3.3、FR-4、FR-6.5、FR-7、NFR-3〜NFR-5、AC-2〜AC-4。

### Step 5: promotion／repairのunit・integration回帰テストを完成する

- [x] `tests/unit/t356-promote-self-plugin-carveout.test.ts` を新しいmanaged projection契約へ更新し、期待集合、deterministic relation、stage graph、Codex正規runner、未選択zero-impactを検証する。
- [x] `tests/integration/t356-promote-self-plugin-carveout.integration.test.ts` または責務を明確にした新規integration testで、5面生成の2回目no-op、任意ファイルの欠損／改変、ORPHAN、Codex MISPLACED、root `.kiro` 不在を検証する。
- [x] 同integration層へ、未管理ファイルと別pluginを保存するcase、事前検証失敗のwrite-0、途中失敗注入後の全bytes rollback、診断にplugin・harness・path／段階が出るcaseを明示的に追加する。
- [x] `tests/integration/t415-plugin-optin-reconciliation.integration.test.ts` の既存selection／install/drop／doctor／stale／activation checkpoint回帰を維持し、current-host-only repairとCodex runner destinationを補強する。

Trace: FR-4.3〜FR-4.5、FR-6.3、FR-7、NFR-1、NFR-3、NFR-5、AC-3、AC-4、AC-6。Requirements Review FOLLOW-UPの全4観点を列挙テストへ落とす。

### Step 6: fresh Git fixtureによるComprehensive E2Eを追加する

- [x] `tests/e2e/t415-plugin-optin-cross-harness.serial.test.ts` を拡張するか専用serial E2Eを追加し、5 self-install面をそれぞれ独立した実Git repositoryへcheckoutする。
- [x] 各面でstartup前からformal-model-checkが正規entry surface／compiled graphから発見できること、startupを2回実行して毎回 `git status --porcelain --untracked-files=all` が空でtracked bytesが不変なことを検証する。
- [x] 1ファイル欠損／改変時は現在面だけが正規bytesへ戻り、他4面はbyte-identicalであることを検証する。未選択fixtureではpromotion／startup前後とも投影追加0件、Git cleanを検証する。
- [x] Kiro CLI／IDEを別package fixtureとして検証し、neutral payloadは存在するがself-install集合・root `.kiro` projectionには入らないことを固定する。

Trace: FR-1〜FR-5、NFR-1〜NFR-4、AC-1〜AC-5、Verification Requirements 2〜8。

### Step 7: packageとselfの生成物を正規generatorから再生成する

- [x] `bun scripts/package.ts` で7 package面とneutral bundleを再生成し、package treeの0-plugin compile-visible baselineを維持する。`dist/` は手編集しない。
- [x] `bun run promote:self` で5 self-install面の選択済み投影を生成し、plugin source／relation／payload／graph／entry surfaceをGit管理対象へ揃える。
- [x] 非正規 `.codex/skills/amadeus-formal-model-check` と決定的投影外のmachine-local履歴を生成物集合から除外し、Claude precedentも同じ決定的契約へ正規化する。

Trace: FR-2.4、FR-3.2、FR-3.4、FR-5、FR-6、NFR-1〜NFR-2、AC-1〜AC-3、AC-5〜AC-6。

### Step 8: test configurationと全verification gateを通す

- [x] 既存Bun test設定（`package.json`、`tests/run-tests.ts`、`tsconfig.tests.json`）で新規unit／integration／serial E2Eが正しいtierに発見されることを確認する。新しいtest frameworkは追加しない。必要ならcoverage registryを正規generatorで更新し、test path全数とrunnerの実行ファイル数を照合する。
- [x] 変更単位ごとにfocused Red→Greenを記録し、最後に関連unit／integration／E2Eをまとめて実行する。
- [x] `bun scripts/package.ts --check`、`bun run promote:self:check`、`bun run distribution:check`、`bun run typecheck`、`bun run lint`、`bun run test:ci` を実行する。必要なserial E2EがCI集合外なら該当ファイルを明示実行する。
- [x] 最終的に `git status --porcelain --untracked-files=all` を確認し、意図したコード・テスト・決定的生成物・AIDLC record以外の差分がないことを確認する。

Trace: FR-6.3〜FR-6.4、FR-7、NFR-2、NFR-5、Verification Requirements 1〜10、AC-1〜AC-6。

## 非適用レイヤー

- API／endpoint、repository／data access、database migration、frontend、deployment/IaCは、このBun-only CLIのfile projection修復には存在しないため非適用。
- 新規performance testは性能要件がないため非適用。安全性はStep 1、3、5、6のpath closure、未管理ファイル保護、write-0、rollback、実Git検査で扱う。
- README等の利用者文書変更は、実装で公開コマンドや既存package契約が変わった場合だけ同じ生成正本から最小更新する。用語Issue #2029/#2030やplugin marketplaceは対象外。
