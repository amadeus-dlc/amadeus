# Code Generation Plan — plugin-optin-parity

## 1. 計画メタデータ

- Unit: `plugin-optin-parity`
- Issue: [#2018](https://github.com/amadeus-dlc/amadeus/issues/2018)
- Scope: `self-fix`
- Depth: Minimal
- Test Strategy: Comprehensive
- 実装方式: Brownfield、TypeScript/ESM、Bun、TDD
- 計画入力:
  - `inception/requirements-analysis/requirements.md`
  - `amadeus/spaces/default/codekb/amadeus/business-overview.md`
  - `amadeus/spaces/default/codekb/amadeus/architecture.md`
  - `amadeus/spaces/default/codekb/amadeus/code-structure.md`
  - `.codex/amadeus-common/stages/construction/code-generation.md`

本 Unit には user-stories / application-design / functional-design / nfr-design / infrastructure-design の個別成果物がないため、承認済み `requirements.md` と Brownfield の CodeKB、現行コードを実装境界の正本とする。CodeKB に残る「OpenCode は manual-only」という観測は、`requirements.md` FR-2.7 の利用者裁定により廃止済みである。

## 2. 実装境界と前提

- project-level の導入意思は `<project>/amadeus/config.json` の `plugins` だけを正本とする。`plugins/<name>/` は供給元、`<host>/.amadeus-plugin-src/<name>/` は現在のハーネスの materialized staging、`<host>/.amadeus-plugin-composition.json` は合成結果であり、いずれも opt-in の代替にはしない。
- 1つのセッション開始イベントは現在のハーネスだけを再調整する。既存の明示的な `compose --all-harnesses` は手動運用の互換経路として残すが、自動導入からは呼ばない。
- 既存の `amadeus-plugin-compose.ts` の plugin 単位 transaction を合成の正本として再利用する。project source、project config、host staging を跨ぐ install の補償処理は CLI 上位の transaction seam に閉じ込める。
- `dist/`、self-install 面、`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` の正本コピーは手編集しない。framework source を変更後、package/promote コマンドで生成する。
- 形式検査は自動実行しない。自動導入は plugin を利用可能にするところまで、activation は read-only judgment、TLC 実行は利用者が明示した `formal-model-check` stage に限定する。
- テスト番号は調査時点の次番 `t413` を本 Unit に割り当てる。実装開始直前に `rg --files tests` で競合を再確認し、既に使用されていれば同一 Unit の全新規ファイルを次の未使用番号へ一括変更する。

## 3. 変更対象

### 3.1 正本コード・設定

| ファイル | 予定する変更 |
| --- | --- |
| `packages/framework/core/tools/amadeus-config.ts` | `plugins` の closed schema、名前検証、昇順正規化、global-only 制約、既定 `[]` を追加する |
| `packages/framework/core/tools/amadeus-plugin-selection.ts`（新規） | desired/source/staging/composition の状態コード、事前検証、再調整計画、atomic config write、install 補償 snapshot/restore を集約する |
| `packages/framework/core/tools/amadeus-plugin.ts` | `compose` / `install` / `drop` / `doctor` / `status` を project selection と同期し、現在の host のみ再調整する |
| `packages/framework/core/tools/amadeus-plugin-activation.ts` | `not-ready` を含む4値 judgment と構造化 advisory を実装し、仕様0件を成功 verdict として記録しない |
| `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` | model-map の有効対象判定を activation と明示実行の共通 seam として公開する |
| `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts` | OpenCode の公式 session event から現在の `.opencode` に auto-compose を接続する |
| `packages/framework/harness/opencode/lib/amadeus-opencode-vocab.ts` | `session.created` の payload 判定と project/host 解決を純粋関数として追加する |
| `scripts/plugin-projection.ts` | OpenCode の `manual-only` 分類を廃止し、JS plugin 自動導入面として bundle/INSTALL/disposition を投影する |
| `amadeus/config.json` | 本 repository の dogfood opt-in として `"plugins": ["formal-model-check"]` を追加する |

`packages/framework/core/tools/amadeus-plugin-compose.ts` の compose/drop transaction API は原則変更しない。補償処理に不足する最小の snapshot/restore seam が実装時に判明した場合だけ、その seam と対応する `tests/unit/t252-plugin-composition.test.ts` を同じ Step 内で変更し、合成規則自体は変更しない。

### 3.2 テスト

| 層 | ファイル | 主な検証対象 |
| --- | --- | --- |
| Unit | `tests/unit/t257-amadeus-config.test.ts` | `plugins` schema、global-only、正規化、拒否ケース |
| Integration | `tests/integration/t413-plugin-optin-selection.integration.test.ts`（新規） | 6状態の判定表、再調整 plan、fail-closed、補償判断 |
| Unit | `tests/unit/t313-doctor-plugin-section.test.ts` / `tests/unit/t314-doctor-plugin-rows.test.ts` | doctor の正規化 code と表示・exit 寄与 |
| Unit | `tests/unit/t306-plugin-host-class.test.ts` / `tests/unit/t326-adapter-compose-seam.test.ts` | 7 face の自動 trigger 分類と OpenCode seam |
| Unit | `tests/unit/t-formal-verif-run-model-check.test.ts` / `tests/unit/t-formal-verif-tla-model-loader.test.ts` | 有効モデルなしの明示検査拒否 |
| Integration | `tests/integration/t257-amadeus-config.integration.test.ts` | 実FSで project config のみ有効、space/intent は設定エラー |
| Integration | `tests/integration/t353-plugin-install-verb.integration.test.ts` | supply/config/staging/composition の install 同期と rollback |
| Integration | `tests/integration/t340-plugin-drop-fs-restore.integration.test.ts` | 安全な drop、config 更新順序、供給元保持、失敗時不変 |
| Integration | `tests/integration/t339-plugin-doctor-standalone-render.integration.test.ts` | desired を含む doctor/status の状態別診断 |
| Integration | `tests/integration/t413-plugin-optin-reconciliation.integration.test.ts`（新規） | fresh/current/stale/remove/source-missing/partial-failure/retry の現在host再調整 |
| Integration | `tests/integration/t303-plugin-projection-harness.integration.test.ts` | OpenCode を含む7 face の生成物と trigger disposition |
| Integration | `tests/integration/t378-advisories-directive-field.integration.test.ts` / `tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` / `tests/integration/t382-activation-real-layout-spec-root.integration.test.ts` | 4値 activation、3 checkpoint、main/single、latch |
| E2E | `tests/e2e/t341-plugin-conformance-journey.serial.test.ts` | 公開 CLI の install→doctor→drop journey と rollback |
| E2E | `tests/e2e/t413-plugin-optin-cross-harness.serial.test.ts`（新規） | fresh worktree、7 face/6 host、3 checkpoint、main/single parity、zero-impact |
| Perf | `tests/perf/t413-plugin-optin-startup-performance.test.ts`（新規） | desiredなし/current各100回、初回導入30回の p95 退行上限 |
| Distribution | `tests/integration/t311-zero-plugin-byte-identical.integration.test.ts` / `tests/integration/t379-plugin-tools-distribution.integration.test.ts` / `tests/integration/t-package-generated-plugin-sources.integration.test.ts` | zero-impact、新core toolの全配布、generated formal-model source parity |

Comprehensive 戦略として、構成判定・再調整・activation の各 component に unit/integration/E2E を通算10〜15ケース配置する。実FS/process を使うケースは unit allowlist を増やさず integration/E2E に置き、各ファイルへ既存形式の `// size:` を付ける。テスト設定は既存 `package.json`、`tests/run-tests.ts`、`tests/lib/test-size.ts` を利用し、新しい framework は追加しない。新規ファイルが自動 discovery されることと size classification をテスト実行前に確認する。

### 3.3 ドキュメント

- `docs/guide/19-plugins.md` / `docs/guide/19-plugins.ja.md`
- `docs/guide/21-layered-config.md` / `docs/guide/21-layered-config.ja.md`
- `docs/reference/06-hooks-and-tools.md` / `docs/reference/06-hooks-and-tools.ja.md`
- `docs/reference/19-layered-config.md` / `docs/reference/19-layered-config.ja.md`
- `docs/reference/21-formal-model-following.md` / `docs/reference/21-formal-model-following.ja.md`
- `docs/reference/22-formal-model-supply.md` / `docs/reference/22-formal-model-supply.ja.md`
- `plugins/formal-model-check/README.md`

英語版と日本語版を同じ契約へ更新し、project-level opt-in、現在hostだけの自動導入、OpenCode session event、状態コード、TLC非自動実行、直接編集とCLI同期を説明する。

## 4. 番号付き実装計画

### Step 1: ベースラインと Red の固定

- [x] 対象ファイルの現行テストを実行し、変更前 Green と `t413` の未使用を確認する。
- [x] `tests/unit/t257-amadeus-config.test.ts`、`tests/integration/t353-plugin-install-verb.integration.test.ts`、`tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` に、Issue #2018 を再現する最小 Red を各1件ずつ追加する。
- [x] Red は「desired=`formal-model-check` なのに fresh Codex host の0/0をcurrentと判定する」「install成功前にconfigを確定してしまう」「仕様0件をnever-run/currentとして扱える」の3経路を明示的に落とす。

Trace: FR-1、FR-1A、FR-2、FR-3、FR-5、FR-6、NFR-1、NFR-2。

### Step 2: project-level `plugins` 設定の parse 契約

- [x] `tests/unit/t257-amadeus-config.test.ts` に、キーなし、空配列、1件、複数件、順序正規化、重複、型違い、大文字、空白、Unicode、先頭/末尾ハイフン、`.`、`..`、64/65文字境界、space/intent 記載拒否を追加する（10〜15ケースの table-driven test）。
- [x] `tests/integration/t257-amadeus-config.integration.test.ts` に、実際の `amadeus/config.json` 読取と global-only 診断を追加する。
- [x] `packages/framework/core/tools/amadeus-config.ts` の closed allowlist と `AmadeusConfig` に昇順 `plugins` を追加し、無指定/空を `[]` として返す。space/intent の `plugins` は project-only の期待値を含む configuration error にする。
- [x] 既存 `AmadeusConfig` の期待値・stub は新しい `plugins: []` を明示して型と既存契約を保つ。

Trace: FR-1.1〜FR-1.8、FR-6.1、NFR-1、NFR-2、NFR-5。

### Step 3: desired state と再調整 plan の深いモジュール化

- [x] `tests/integration/t413-plugin-optin-selection.integration.test.ts` を先に作り、`not-selected`、`source-missing`、`not-installed`、`stale`、`current`、`failed` の6状態、名前順決定性、全source事前検証、managed staging のみ削除、部分成功後のretry planを検証する。
- [x] `packages/framework/core/tools/amadeus-plugin-selection.ts` を追加し、project root、host root、desired名、source/staging/composition observation から pure な判別 union と reconcile plan を返す。
- [x] 同モジュールに `amadeus/config.json` の原子的な temp+rename 更新、source/staging の scoped snapshot/restore、containment check を置く。plugin名からのpathは `plugins/` と現在hostの `.amadeus-plugin-src/` を越えないことをスマートコンストラクタで保証する。
- [x] 設定不正またはsource不足は全pluginを変更前に拒否し、合成開始後は既存 engine transaction の plugin単位 commit を維持する。

Trace: FR-1.3〜FR-1.8、FR-2.2〜FR-2.5、FR-2A、FR-3.1〜FR-3.3、NFR-1、NFR-2、NFR-3、NFR-5。

### Step 4: `compose` の現在host自動導入と冪等再調整

- [x] `tests/integration/t413-plugin-optin-reconciliation.integration.test.ts` に fresh 0/0、current no-op、source変更によるstale、desired削除、複数pluginの1件失敗、次回retryを実FSで追加する。
- [x] `packages/framework/core/tools/amadeus-plugin.ts` の `isRecordCurrent` と `handleCompose` を desired state 基準へ切り替える。stagingのdiscover件数だけで 0/0 を current としない。
- [x] compose開始前に設定全体と全sourceを検証し、現在hostへ desired source を昇順で materialize してから既存 inspect/plan/apply を呼ぶ。desiredから外れた plugin は composition record の所有権とsource一致を確認してから安全にdrop/pruneする。
- [x] `compose --if-stale` は `not-selected` か `current` のみ無変更、`not-installed`/`stale` は再調整、`source-missing`/`failed` は plugin名・host・失敗段階付き非0とする。
- [x] 明示的 `compose --all-harnesses` は存在する各hostに同じ単一host処理を順番に適用する互換経路として残し、セッション開始hookからは使用しない。

Trace: FR-2.1〜FR-2.5、FR-2A.1〜FR-2A.5、FR-3.1〜FR-3.3、FR-6.1〜FR-6.3、NFR-1〜NFR-4。

### Step 5: `install` / `drop` と project config の同期・補償

- [x] `tests/integration/t353-plugin-install-verb.integration.test.ts` に source永続化、config追加、同一source冪等、異source `--force`、copy/verify/compose/recompile/runner/config-write失敗時の4面rollbackを追加する。
- [x] `tests/integration/t340-plugin-drop-fs-restore.integration.test.ts` に host安全削除後のconfig削除、source保持、plan/verify/recompile/runner/config-write失敗時config不変、user-managed staging非削除を追加する。
- [x] `packages/framework/core/tools/amadeus-plugin.ts` の `install` を「入力検証→project `plugins/<name>/` へatomic copy→現在host staging/compose→最後にconfig確定」とし、途中失敗は config/source/staging/composition と生成されたhost所有物を実行前snapshotへ戻す。
- [x] `drop` は現在hostの安全なdropとmanaged staging除去が完了した後だけconfigから名前を除き、`plugins/<name>/` は残す。失敗時はconfigを変更しない。
- [x] `compose` / `compose --if-stale` / `doctor` / `status` が config bytes を変更しないことを実FSのreconciliation/doctorテストで固定する。

Trace: FR-1A.1〜FR-1A.7、FR-2.4〜FR-2.5、FR-6.2〜FR-6.3、NFR-1、NFR-2、NFR-5。

### Step 6: diagnosis、警告、公開CLI結果

- [x] `tests/unit/t313-doctor-plugin-section.test.ts` で `doctorPluginRows` まで直接通し、6状態から表示/exitへの全数写像を追加する。
- [x] `tests/integration/t339-plugin-doctor-standalone-render.integration.test.ts`、`t413-plugin-optin-selection.integration.test.ts`、`t413-plugin-optin-reconciliation.integration.test.ts` の組合せで6状態、host名/plugin名/不足箇所、config非変更を追加する。
- [x] `packages/framework/core/tools/amadeus-plugin.ts` の doctor/status projection を desired/source/staging/composition の observation に接続し、成功済みと失敗pluginを個別表示する。
- [x] `packages/framework/core/hooks/amadeus-plugin-compose.ts` は既存の非ブロッキング契約を保ち、失敗時はCLIの詳細に加えて対象hostと再試行コマンドを1回だけ警告する。成功/no-opでは無警告とする。

Trace: FR-2A.4〜FR-2A.5、FR-3.4〜FR-3.5、FR-6.1、NFR-4、NFR-5。

### Step 7: 7 face / 6 host の lifecycle 配線、特に OpenCode

- [x] `tests/unit/t306-plugin-host-class.test.ts` と `tests/unit/t326-adapter-compose-seam.test.ts` を Red にし、OpenCode が manual-only/deferred でないこと、公式eventから1回だけ現在hostをcomposeすることを固定する。
- [x] `packages/framework/harness/opencode/lib/amadeus-opencode-vocab.ts` に `session.created` 判定を追加し、`packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts` の既存 plugin export に auto-compose callback を統合する。presence minting とplugin composeは同一module内で責務を分岐し、失敗は警告してsessionを継続する。
- [x] `scripts/plugin-projection.ts` のOpenCode host class/trigger/dispositionとINSTALL生成を自動導入契約へ更新する。OpenCodeにはshell snippetを偽装せず、`.opencode/plugin/amadeus-opencode-plugin.ts` が lifecycle接続点であることを投影する。
- [x] `tests/integration/t303-plugin-projection-harness.integration.test.ts` と `t327-hook-wiring-xor-closure.integration.test.ts` で7 faceが1つのauto trigger armを持ち、Kiro 2 faceは `.kiro` を共有することを検証する。

Trace: FR-2.1〜FR-2.7、FR-4.1、FR-6.3、NFR-3、NFR-5。

### Step 8: formal-model-check の `not-ready` と明示実行境界

- [x] `tests/integration/t378-advisories-directive-field.integration.test.ts` と `tests/integration/t382-activation-real-layout-spec-root.integration.test.ts` に `not-ready` / `never-run` / `changed` / `current` の4値と構造化 field（plugin/checkpoint/code/target-or-reason）を追加する。
- [x] `tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` に3 checkpoint × main/single の同値性、unselected時の無案内、current時の無案内、TLC非起動を追加する。
- [x] `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` に「有効な宣言済みmodelとcfgが存在する」read-only readiness判定を追加し、生成コピーを経由して明示実行側も同じ判定を使う。
- [x] `packages/framework/core/tools/amadeus-plugin-activation.ts` の judgment/advisory を4値へ拡張し、対象なし/削除/無効mapは `not-ready`、対象あり成功記録なしは `never-run`、hash差分は `changed`、一致は `current` とする。`recordActivationVerdict` は `not-ready` で書かない。
- [x] `tests/unit/t413-formal-model-readiness.test.ts`、`tests/integration/t-formal-verif-tla-model-loader.integration.test.ts`、`t382-activation-real-layout-spec-root.integration.test.ts` で、対象なしの明示検査が理由付き非0、対象追加後は成功可能、対象削除後は過去recordがあっても `not-ready` へ戻ることを固定する。

Trace: FR-4.1〜FR-4.7、FR-5.1〜FR-5.4、FR-6.1、NFR-1、NFR-3〜NFR-5。

### Step 9: Comprehensive の cross-harness E2E と性能回帰

- [x] `tests/e2e/t413-plugin-optin-cross-harness.serial.test.ts` を作り、fresh fixtureの7 face/6 hostについて、project configに選択ありなら各face起動時に「そのhostだけ」staging/recordが作られ、他hostが不変であることを検証する。
- [x] `tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` で Requirements Analysis、Functional Design、Build and Test の各checkpointを main workflow と `--single` の双方で実行し、構造化advisoryがbyte-equalであることを比較する。
- [x] 同E2Eで未opt-in repoの全faceがconfig/staging/composition/graphを変更せず、advisoryもTLC stateも発生しないことを検証する。
- [x] `tests/e2e/t341-plugin-conformance-journey.serial.test.ts` とinstall/drop/reconciliation integrationで公開CLIのinstall→再起動no-op→doctor→drop→再起動not-selectedを固定する。
- [x] `tests/perf/t413-plugin-optin-startup-performance.test.ts` を作り、同一runnerで baseline/変更後を交互測定する。desiredなし/currentは各100回、初回導入は既存install+compose基準と自動導入を各30回測定し、p95増加が `max(20%, 25ms)` / `max(20%, 50ms)` 内であることを判定する。

Trace: FR-2、FR-3、FR-4、FR-5、FR-6、NFR-1、NFR-3、NFR-4、NFR-5。

### Step 10: 利用者・開発者ドキュメントの同期

- [x] `docs/guide/19-plugins*` と `plugins/formal-model-check/README.md` に opt-in正本、CLI同期、現在hostだけの自動導入、OpenCode、状態と回復手順、TLC非自動実行を記載する。
- [x] `docs/guide/21-layered-config*` と `docs/reference/19-layered-config*` に `plugins` schema、global-only、直接編集の正式サポート、default `[]` を記載する。
- [x] `docs/reference/06-hooks-and-tools*` に6 hostの接続点と非ブロッキング警告を記載する。
- [x] `docs/reference/21-formal-model-following*` と `docs/reference/22-formal-model-supply*` に4値 judgment、`not-ready`、明示検査の前提を記載する。
- [x] 英日ドキュメントの契約語彙とコード例を照合し、OpenCode manual-only の記述を残さない。

Trace: FR-1〜FR-6、NFR-3、NFR-5。

### Step 11: package生成、self-install同期、drift guard、最終検証

- [x] `bun scripts/package.ts` を実行し、generated formal-model source と7 harness distを更新する。`dist/` は生成差分だけであることを確認する。
- [x] `bun run promote:self` を実行し、存在するself-install harness面を正本から同期する。composition record等のmachine-local runtime dataを正本化しない。
- [x] 変更対象テストpathを確認してから、unit→integration→E2E→perf の順に対象24ファイルを実行し、267 test / 1,608 assertionsを照合する。
- [x] `bun run typecheck`、`bun run lint`、`bun run test:ci` を実行する。重いintegrationが既知のcold timeoutになった場合は該当ファイルを `bun test --timeout 120000 <file>` で単独再実行し、実失敗と区別する。
- [x] `bun scripts/package.ts --check`、`bun run promote:self:check`、`bun run distribution:check` を実行し、package/self-install/docs/distribution driftを0件にする。
- [x] package後に `tests/integration/t311-zero-plugin-byte-identical.integration.test.ts`、`tests/integration/t379-plugin-tools-distribution.integration.test.ts`、`tests/integration/t-package-generated-plugin-sources.integration.test.ts` を再実行する。
- [x] 最終diffで `dist/` がpackage生成差分だけであること、FR/NFR対応表の全行にGreen evidenceがあることを確認する。

Trace: FR-6.3、NFR-1、NFR-3、NFR-4、および検証要件1〜12。

## 5. 要件トレーサビリティ

| 要件 | 実装ファイル | テストファイル | Step |
| --- | --- | --- | --- |
| FR-1 | `amadeus-config.ts`, `amadeus-plugin-selection.ts`, `amadeus/config.json` | `t257-amadeus-config.test.ts`, `t257-amadeus-config.integration.test.ts`, `t413-plugin-optin-selection.integration.test.ts` | 2, 3 |
| FR-1A | `amadeus-plugin-selection.ts`, `amadeus-plugin.ts` | `t353-plugin-install-verb.integration.test.ts`, `t340-plugin-drop-fs-restore.integration.test.ts`, `t341-plugin-conformance-journey.serial.test.ts` | 5, 9 |
| FR-2 | `packages/framework/core/tools/amadeus-plugin-selection.ts`, `packages/framework/core/tools/amadeus-plugin.ts`, `packages/framework/core/hooks/amadeus-plugin-compose.ts`, OpenCode plugin/vocab、`scripts/plugin-projection.ts` | `t413-plugin-optin-reconciliation.integration.test.ts`, `t303-plugin-projection-harness.integration.test.ts`, `t413-plugin-optin-cross-harness.serial.test.ts` | 4, 7, 9 |
| FR-2A | `packages/framework/core/tools/amadeus-plugin-selection.ts`, `packages/framework/core/tools/amadeus-plugin.ts`, `packages/framework/core/hooks/amadeus-plugin-compose.ts` | `t413-plugin-optin-selection.integration.test.ts`, `t413-plugin-optin-reconciliation.integration.test.ts`, `t353-plugin-install-verb.integration.test.ts` | 3〜6 |
| FR-3 | `amadeus-plugin-selection.ts`, `amadeus-plugin.ts` | `t313-doctor-plugin-section.test.ts`, `t314-doctor-plugin-rows.test.ts`, `t339-plugin-doctor-standalone-render.integration.test.ts` | 3, 4, 6 |
| FR-4 | `amadeus-plugin-activation.ts`, `amadeus-orchestrate.ts`（既存checkpoint集合を維持） | `t378-advisories-directive-field.integration.test.ts`, `t381-advisory-checkpoints-latch.integration.test.ts`, `t413-plugin-optin-cross-harness.serial.test.ts` | 8, 9 |
| FR-5 | `amadeus-formal-verif-model-map.ts`, `amadeus-plugin-activation.ts` | formal-verif unit群、`t382-activation-real-layout-spec-root.integration.test.ts`, cross-harness E2E | 8, 9 |
| FR-6 | 上記正本、`scripts/plugin-projection.ts`、package/promote生成面 | `t311-zero-plugin-byte-identical.integration.test.ts`, distribution tests, cross-harness E2E | 4, 7, 9, 11 |
| NFR-1 | config/selection/CLI/activation のpure planと昇順処理 | unit全般、reconciliation integration、cross-harness E2E | 2〜9 |
| NFR-2 | `amadeus-plugin-selection.ts`, 既存compose transaction | selection unit、install/drop/reconciliation integration | 3〜5 |
| NFR-3 | core正本、OpenCode harness overlay、package/promotion | projection/distribution tests、cross-harness E2E | 7, 9, 11 |
| NFR-4 | no-op fast path、現在host限定処理 | `t413-plugin-optin-startup-performance.test.ts` | 4, 9 |
| NFR-5 | selection state union、doctor/status/hook renderer | doctor unit/integration、reconciliation integration、E2E | 3, 6, 9 |

## 6. 完了条件

- [x] FR-1〜FR-6（FR-1A/FR-2Aを含む）とNFR-1〜NFR-5の各行に実装差分とGreen test evidenceがある。
- [x] fresh worktree の7 faceでopt-in pluginが現在hostだけへmaterializeされ、未opt-in repoはzero-impactである。
- [x] 3 checkpoint × main/singleで同じ構造化activation judgmentを返し、TLCを自動実行しない。
- [x] install/drop失敗注入でconfig/source/staging/compositionの契約どおりの不変・補償を確認できる。
- [x] Comprehensive のunit/integration/E2E/perfがGreenである。
- [x] package/self-install/docs/distributionのdrift guardがGreenで、`dist/`に手編集差分がない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T11:34:52Z
- **Iteration:** 1
- **Scope decision:** none

承認済みComprehensive計画と要件が必須とする横断E2E、障害時安全性、全状態診断、性能検証が未完了であり、Code Generationでのテスト作成を後続へ延期できないため承認不可。

### Findings

- BLOCKER: 7 face fresh-worktree、3 checkpoint × main/single、未opt-in zero-impact、TLC非自動実行の横断E2Eを実装・実行すること。
- BLOCKER: 全failure injection、rollback、不変条件、部分成功、retry、CLI終了値、警告、doctor 6状態表示を検証すること。
- BLOCKER: 承認済みの同一runner比較で未選択、current、初回導入のp95上限を確認すること。
- MAJOR: formal-model-checkの共通readiness seamへ統合するか計画変更し、全状態遷移の意味的一致を証明すること。
- MAJOR: 未完了項目を実施してチェックを更新するか、計画変更を再承認して変更後の完了条件を満たすこと。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T12:30:31Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のBLOCKER 3件・MAJOR 2件はすべて閉包し、承認済みComprehensive計画の全チェックと完了条件が完了した。要件・計画・サマリー間に承認を妨げる矛盾はない。

### Findings

- None
