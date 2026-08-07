# Developer Code Scan — 260807-tla-specs-relocation

- Intent: `260807-tla-specs-relocation`(Issue #2398: TLA+ 仕様を `specs/tla/` → `amadeus/spaces/<space>/specs/tla/` へ移設)
- Scan mode: **xrev scan mode**(cid:reverse-engineering:c1-xrev-single-issue)— 2 件のクロスレビュー verdict を一次入力とし、全 claim を observed SHA 上で実測検証
- Scan 種別: **DIFFERENTIAL refresh**(cid:reverse-engineering:c1)。フルスキャンは行わず base→observed の差分と本 intent の影響面に集中
- Base commit: `7060956c5617125dd2f4e284957aa180cb306484`
- Observed commit: `d98dd9039db3949eeb140941deeb4468f717e57a`(`git rev-parse HEAD` で一致確認、exit 0)
- Interval: 85 commits / 1232 files(大半は docs/metrics ノイズ)。本 intent 関連面では差分内に `specs/tla/FormalElection.tla`、`specs/tla/model-map.json`、`packages/framework/core/tools/amadeus-formal-verif-model-map.ts`、`amadeus-sensor-model-completeness.ts`、`plugins/formal-model-check/`(README/plugin.json/stages/tools 複数)、`.github/workflows/ci.yml`、`docs/**` 多数が含まれ、影響面は生きている
- Scope: `self-refactor` / Brownfield / 単一 repo `amadeus` / Depth: Minimal / Test Strategy: Comprehensive
- すべての file:line 引用は observed commit `d98dd9039db3949eeb140941deeb4468f717e57a` 上で計測

## Developer Code Scan Results

### Packages Found(本 intent 影響面のみ)

- `specs/tla/` — TLA+ 仕様層 — TLA+/JSON — 移設対象本体。9 ファイル: `FormalElection.{tla,cfg}`、`MirrorLifecycle.{tla,cfg}`、`MirrorLifecycleAsImplemented.{tla,cfg}`、`MirrorLifecycleCore.tla`(auxiliary)、`MirrorLifecycleVacuity.cfg`、`model-map.json`(schemaVersion 2、**登録モデルは 2 件**: FormalElection / MirrorLifecycle。MirrorLifecycleAsImplemented は意図的に未登録 — `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts:106` が `toBeUndefined()` で pin)
- `packages/framework/core/tools/` — フレームワーク正準ツール — TypeScript(Bun) — model-map 定数・activation watch・model-completeness センサー実装・advisory 文言のハードコードが住む
- `packages/framework/core/sensors/` — コアセンサー定義 — Markdown(frontmatter) — model-completeness の matches glob が住む
- `plugins/formal-model-check/` — formal-model-check プラグイン — TypeScript + Markdown — loader / CI runner / authoring / evidence / ステージ定義。`tools/amadeus-formal-verif-model-map.ts` は core 側の **byte-identical 鏡像**(`scripts/package.ts:808-809` の projection、`tests/integration/t-package-generated-plugin-sources.integration.test.ts:21-22` が byte 一致を guard)

### Build System

- **Type**: Bun モノレpo(`bun install --frozen-lockfile`、`bun run build` で dist 生成)
- **Config Files**: `package.json`、`bunfig.toml`、`biome.json`、`scripts/package.ts`(dist 投影・plugin 鏡像生成)
- **Build Dependencies**: core → plugin 鏡像(`amadeus-formal-verif-model-map.ts`)、core/plugins → `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode,pi}` 8 ハーネス + `dist/plugins`
- **`specs/tla` は dist に投影されない**:`scripts/package.ts`・`scripts/promote-self.ts` に `specs` 参照ゼロ。`find dist -name "specs" -o -name "*.tla"` は 0 件。dist に焼き込まれるのはツール/センサー **コード内の `specs/tla` 文字列**のみ(477 occurrences / 138 files、gitignore 済み生成物)

### APIs Discovered(影響面の内部 API)

- `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` — model-map v2 の正準 API:
  - `:53-55` `TLA_MODEL_PATH` / `TLA_CFG_PATH` / `TLA_MODEL_MAP_PATH = "specs/tla/model-map.json"`
  - `:58-63` `tlaModelPath(name)` / `tlaCfgPath(name)` — `specs/tla/<Name>.{tla,cfg}` を生成
  - `:33-43` `canonicalIdentity()` — domain 分離 canonical ハッシュ(digest ピンの実体。**パス移動では identity は変わらない**;変わるのは map 内の `path` 値)
  - `:250` v2 validator が `posix.dirname(value) !== "specs/tla"` を fail 条件に**スキーマレベルで正準パス固定**(`:272` auxiliaries も同様)
  - `:373` `parseTlaModelMap()`、`:441` `findModelMapModel()`、`:445` `diffModelMap()`
- `packages/framework/core/tools/amadeus-plugin-activation.ts` — spec-hash watch / advisory:
  - `:42` `ACTIVATION_WATCH_GLOBS = ["specs/tla/**"]`
  - `:100-102` `specRootForHost(hostRoot) = dirname(hostRoot)`(ノルム cid:code-generation:cg-watch-root-separation、`amadeus/spaces/default/memory/project.md:408`)
  - `:229` advisory 文言 `spec hash CHANGED (specs/tla)`(`:231` `has no recorded verdict (specs/tla)`、`:233` `add a valid specs/tla/model-map.json target`、`:304-305` `target: "specs/tla"` も同根)
  - `:296`/`:447`/`:481` `computeSpecHash(specRootForHost(hostRoot), …)` — 相対パスをハッシュへ fold する設計のため、**移設は watch ハッシュの drift として必ず検出される**
- `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` — センサー実装:
  - `:37` `MODEL_MAP_RELATIVE_PATH = "specs/tla/model-map.json"`(他 `:239,:349,:699,:799,:912,:919,:940,:960,:984,:1006,:1042,:1069,:1090` が同定数経由)
  - `:507,:535,:760` テンプレートリテラル `` `specs/tla/${name}.tla` `` の直接生成
- `plugins/formal-model-check/tools/tla-model-loader-internal.ts` — ローダ:`:186` 境界チェック文言 `asset resolves outside specs/tla`、`:344,:364` パス生成、`:367,:371` MODULE_DEP_UNRESOLVED 文言、`:304-307` identity 照合(SOURCE_DRIFT 棄却)
- `packages/framework/core/tools/amadeus-lib.ts` — space 解決の既存機構:`:429` `ACTIVE_SPACE_POINTER = "active-space"`、`:1122` `activeSpace(projectDir)`(explicit arg > active-space pointer > "default")。**formal-verif 系ツールはこの resolver を一切呼ばない**(activation/model-map/sensor/loader に `activeSpace` 参照ゼロ、grep exit 1)— 現行の spec 層は space 非依存のルート固定

### Frameworks & Libraries

- Bun 1.3.13 / TypeScript(tsc `--noEmit`)/ Biome(lint)
- TLC(Docker 経由の形式検証ランタイム)— CI runner が bind mount で `specs/tla` を供給

### Test Coverage

- **Test Directories**: `tests/unit/`、`tests/integration/`、`tests/e2e/`、`tests/formal-verif/support/`、`tests/harness/`
- **Test Frameworks**: `bun test`(正準ランナー `tests/run-tests.ts`、per-test timeout 30s)
- **`specs/tla` を参照するテスト/ fixture は 51 ファイル / 272 行**(詳細は §「参照列挙」)。fixture 供給元:
  - `tests/harness/formal-model-fixture.ts:11-12` — map fixture が `specs/tla/${name}.{tla,cfg}` を生成
  - `tests/formal-verif/support/tla-authoring-e2e-fixture.ts:55,59,79` — 実レイアウト fixture
  - `tests/formal-verif/support/tla-toolchain-harness.ts:54` — 実リポジトリの `specs/tla/model-map.json` を読む
- **ベースライン実行結果**(observed SHA、実測):

  | ファイル | pass | fail | expect | exit |
  |---|---|---|---|---|
  | `tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` | 7 | 0 | 20 | 0 |
  | `tests/unit/t-formal-verif-model-map-v2.test.ts` | 27 | 0 | 102 | 0 |
  | `tests/integration/t402-tla-module-deps.test.ts` | 19 | 0 | 40 | 0 |
  | `tests/integration/t403-tla-loader-generalization.test.ts` | 12 | 0 | 36 | 0 |
  | **計** | **65** | **0** | **198** | **0** |

- **最大 tNNN**: **t480**(`tests/unit/t480-degrade-unit-declaration.test.ts`、`tests/integration/t480-declare-units-done.integration.test.ts`)。次回 Bolt 予約は t481 から

### Code Quality Indicators

- **Linting**: Biome(`bun run lint`、cognitive-complexity warnings は既知ベースライン)
- **CI/CD**: `.github/workflows/ci.yml` — `:663` `formal-model-check:` ジョブ、`:665` `if: github.event_name == 'workflow_dispatch'`(手動トリガ限定)。**workflow YAML 自体に `specs/tla` リテラルは 0 件**(`grep -n "specs/tla" .github/workflows/ci.yml` → exit 1)。パス結合は runner 側に住む:
  - `plugins/formal-model-check/tools/ci-model-check-domain.ts:189` — Docker bind mount 検査 `type=bind,src=$WORKSPACE/specs/tla,dst=$WORKSPACE/specs/tla,readonly`
  - `plugins/formal-model-check/tools/run-model-check-diagnostic.ts:217` — `join(workspaceRoot, "specs/tla")`
  - ジョブ本体は `bun plugins/formal-model-check/tools/run-model-check-ci.ts run/verify --root …` を駆動(ci.yml:703,718)
- **Documentation**: `docs/reference/21-formal-model-following.{md,ja.md}`、`docs/reference/22-formal-model-supply.{md,ja.md}`、`docs/reference/07-sensor-system.{md,ja.md}`、`docs/guide/19-plugins.{md,ja.md}` が `specs/tla` を参照(8 ファイル / 21 行)。`docs/amadeus-files.{md,ja.md}` は `amadeus/spaces/<space>/` 配下のレイアウト(settings/memory/knowledge/codekb/intents)を定義するが **`specs/` を記載していない** — 移設で `spaces/<space>/specs/` が新設されるため、この layout 定義への追記が必要(docs 変更点)

### Technical Debt Signals

- **6 系統に散在する `specs/tla` ハードコード**:(a) model-map.json の `path` 値、(b) センサー frontmatter glob + センサー実装の `MODEL_MAP_RELATIVE_PATH`、(c) activation watch glob + advisory 文言、(d) 形式検証定数(`TLA_MODEL_PATH` 等)、(e) loader の境界チェック・パス生成、(f) CI runner の Docker bind mount — 単一の設定点に集約されていない
- **スキーマレベルの正準パス固定**:`amadeus-formal-verif-model-map.ts:250`(core + plugin 鏡像の 2 箇所)が `dirname(value) !== "specs/tla"` を fail — 機械的文字列置換ではなく validator 定数の定義変更を要する
- **active-space 相互作用が未定義**(reviewer-1 未解決1 を追認):spec 層を `amadeus/spaces/<space>/` 配下へ移すと「どの space の specs を watch/実行対象にするか」の解決規則が必要になるが、Issue 本文・現行コードのどちらにも存在しない。現行は space 非依存のルート固定で、`activeSpace()`(amadeus-lib.ts:1122)は formal-verif 系から未参照。watch 基底(`specRootForHost = dirname(hostRoot)` = プロジェクトルート)と space カーソル(`amadeus/active-space`、現行値 `default`)の整合を設計段で明示する必要がある
- **`specs/tla-evidence` は接頭辞が共通なだけの別 root**:`plugins/formal-model-check/tools/tla-evidence.ts:434` `DEFAULT_STORE_ROOT = "specs/tla-evidence"` — `specs/tla` → `amadeus/spaces/<space>/specs/tla` の機械的置換に追従しない。移設対象に含めるか個別判断が要る(observed SHA で `specs/tla-evidence/` 実体は未生成、規約パスのみ存在)。なお activation watch glob `specs/tla/**` の**外**に置く設計判断が 260804-tla-authoring の ADR に記録済み(`amadeus/spaces/default/intents/260804-tla-authoring/inception/application-design/memory.md:19`)

## 参照列挙(observed SHA 実測)

### `specs/tla` リテラル — 全域

- 測定: `git grep -c "specs/tla" HEAD` → **264 ファイル / 727 行**;`git grep -o` の occurrence 数は **826**(reviewer-2 の 826/264 を正確に再現)
- 内訳(git 追跡ファイルのみ。`metrics/` スナップショットのヒットは 0 件):

| 領域 | ファイル数 | 行数 | 性質 |
|---|---|---|---|
| `packages/framework/core/` | 6 | 27 | **actionable**(path-rewrite) |
| `plugins/formal-model-check/` | 10 | 28 | **actionable**(path-rewrite) |
| `specs/tla/`(自己参照) | 5 | 10 | **actionable**(move + map path 値) |
| `docs/` | 8 | 21 | **actionable**(docs) |
| `tests/`(unit 16 / integration 30 / e2e 2 / formal-verif 2 / harness 1) | 51 | 272 | **actionable**(test fixture / 期待値) |
| `amadeus/spaces/default/intents/` | 141 | 302 | 歴史記録 — **書換禁止**(うち audit jsonl は 14 ファイル) |
| `amadeus/spaces/default/elections/` | 30 | 36 | 歴史記録 — **書換禁止** |
| `amadeus/spaces/default/codekb/` | 12 | 30 | 派生キャッシュ — 次回 RE 実行で再導出(手書換不要) |
| `amadeus/spaces/default/memory/` | 1 | 1 | ノルム `project.md:408` の learned エントリ — **書換禁止**(過去の実測記録。必要なら新規 cid を追記) |
| **計** | **264** | **727** | |

- 生成物(gitignore 済み、非追跡): `dist/` 配下 **477 occurrences / 138 ファイル**(reviewer-2 の値を再現)。ソース修正 → `bun run build` で追従。直接編集・コミットは不可
- `scripts/`・`.github/` のヒットは **0 件**(タスク前提の `scripts/ci-model-check-domain.ts:189` は誤り — 実在は `plugins/formal-model-check/tools/ci-model-check-domain.ts:189`)

### `specs/tla-evidence` リテラル

- 計 **15 ファイル / 28 行**。actionable は 3 ファイルのみ:
  - `plugins/formal-model-check/tools/tla-evidence.ts:434`(`DEFAULT_STORE_ROOT`)
  - `docs/reference/22-formal-model-supply.md:238` / `.ja.md:121`
- 残り 12 ファイルは `amadeus/spaces/default/intents/260804-tla-authoring/**` の歴史記録 — **書換禁止**

### `.gitignore`

- `specs` に触れるエントリは **0 件**(`grep -n "specs" .gitignore` → exit 1)。`dist/` は ignore 済み(`git check-ignore dist/kimi` 成功)。移設後 `specs/tla-evidence/.tmp/` 等の一時領域を追跡対象外にするかは設計判断事項

### `model-map.json` コンシューマ(読み手)

| 読み手 | 経由 | 場所 |
|---|---|---|
| model-completeness センサー | `MODEL_MAP_RELATIVE_PATH` + `deps.readFile` → `parseTlaModelMap` | `packages/framework/core/tools/amadeus-sensor-model-completeness.ts:37,365,376` |
| activation 判定 | `evaluateTlaModelReadiness` 経由 | `packages/framework/core/tools/amadeus-plugin-activation.ts:233,290` |
| TLA ローダ | `TLA_MODEL_MAP_PATH` + `verifyAssetPath` | `plugins/formal-model-check/tools/tla-model-loader-internal.ts:27,197` |
| applicability 判定 | `DEFAULT_MODEL_MAP_PATH` | `plugins/formal-model-check/tools/tla-applicability.ts:361` |
| authoring CLI | `readModelMap()`(ローカル関数) | `plugins/formal-model-check/tools/tla-authoring.ts:287,342,428` |
| registration / map CLI | `parseTlaModelMap` | `plugins/formal-model-check/tools/tla-registration.ts`、`plugins/formal-model-check/tools/tla-model-map.ts` |
| arm / toolchain | map 参照 | `plugins/formal-model-check/tools/tla-arm.ts`、`plugins/formal-model-check/tools/tlc-toolchain.ts` |
| テスト基盤 | 実リポジトリの map 直接読取 | `tests/formal-verif/support/tla-toolchain-harness.ts:54`、テストローカル `repositoryModelMap()`(`tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts:24` — ライブラリ関数ではなくテスト内ヘルパー) |

### テストファイル別 `specs/tla` ヒット数(actionable 51 ファイル)

- unit (16): t-formal-verif-model-map-v2:24、t203-mint-presence-classify:6、t-formal-verif-canonical-core:5、t113:4、t415-formal-model-readiness:4、t-formal-verif-tla-model-loader:3、t446-tla-referees:3、t-formal-verif-ci-model-check-domain:2、t-formal-verif-model-completeness-sensor:2、t-formal-verif-run-model-check:2、t401-directive-and-toolchain-rejections:2、t404-tla-vocabulary-supply:2、t448-tla-registration:2、t210-adapter-mint-classifier:1、t457-advisory-auto-resolve:1、t459-advisory-receipt:1
- integration (30): t382-activation-real-layout-spec-root:18、t403-tla-loader-generalization:18、t406-ci-all-models-measure:12、t-formal-verif-model-completeness-sensor-components:12、t-formal-verif-tla-model-loader:12、t-advisory-human-choice-boundaries:10、t-formal-verif-run-model-check-source:10、t320-activation-spec-hash:9、t-formal-verif-model-completeness-sensor:9、t-formal-verif-planned-tlc-runtime:8、t402-tla-module-deps:6、t-advisory-human-choice-domain:6、t-formal-verif-run-model-check-diagnostic:6、t-formal-verif-run-model-check:6、t405-mirror-declaration-drift:6、t380-impl-only-model-map-update:6、t-formal-verif-ci-model-check-runner:5、t-formal-verif-node-ci-model-check-port:5、t-formal-verif-run-model-check-artifacts:5、t-formal-verif-run-model-check-real:5、t-formal-verif-mirror-model-registration:4、t449-tla-registration:4、t378-advisories-directive-field:3、t-advisory-choice-record:1、t-formal-verif-ci-model-check-artifacts:1、t322-activation-lifecycle-behaviour:1、t445-advisory-declaration-supply:1、t450-tla-authoring-stage-e2e:1、t458-advisory-auto-resolution:1、t470-advisory-store-recovery:1
- e2e (2): t-formal-verif-run-model-check:6、t-formal-verif-model-completeness-sensor:4
- formal-verif/support (2): tla-authoring-e2e-fixture:3、tla-toolchain-harness:1
- harness (1): formal-model-fixture:2

## クロスレビュー claim 検証台帳

| claim | 判定 | 実測エビデンス |
|---|---|---|
| specs/tla/ に 9 ファイル、model-map 登録は 2 モデル(REFINED の内容) | 再現 | `git ls-tree -r HEAD -- specs/` → 9 ファイル;`grep -c '"name"' specs/tla/model-map.json` → 2。未登録 pin は t-formal-verif-mirror-model-registration:103-107 |
| digest は domain 分離 canonical ハッシュ(生 SHA-256 と不一致が正しい) | 再現 | `canonicalIdentity` = amadeus-formal-verif-model-map.ts:33-43;map :8 identity=e8cc39a9…(生ハッシュと非一致、設計どおり) |
| センサー glob はセンサー frontmatter 所在(ステージ frontmatter ではない) | 再現 | `packages/framework/core/sensors/amadeus-model-completeness.md:8`;ステージ側は `plugins/formal-model-check/stages/formal-model-check.md:14-16` の `sensors: [- model-completeness]` 宣言のみ。ステージ `inputs:` が `specs/tla/model-map.json` を名指し(:12) |
| `MODEL_MAP_RELATIVE_PATH` ハードコード | 再現 | amadeus-sensor-model-completeness.ts:37(+ :507,:535,:760 のテンプレート直接生成) |
| `specRootForHost = dirname(hostRoot)` + cg-watch-root-separation ノルム | 再現 | amadeus-plugin-activation.ts:100-102、:42;project.md:408(cid コメント付き) |
| ci.yml:663 workflow_dispatch、YAML 内リテラル 0 件 | 再現 | ci.yml:663,665;`grep -n "specs/tla" .github/workflows/ci.yml` → exit 1 |
| runner 側パス結合 ci-model-check-domain.ts:189 | 再現(所在を訂正) | 実在は `plugins/formal-model-check/tools/ci-model-check-domain.ts:189`。`scripts/` 配下に同名ファイルは存在しない |
| model-map v2 validator の正準パス固定 :250 | 再現 | core/plugins 両コピー :250・:272(鏡像は byte-identical 確認済み) |
| advisory 文言「spec hash CHANGED (specs/tla)」生成元と audit 実記録 | 再現 | 生成元 amadeus-plugin-activation.ts:229(追加で :231,:233,:304-305 も同根)。audit `amadeus/spaces/default/intents/260804-tla-authoring/audit/j5ik2o-mac-studio-lan-2a22dd80e265.jsonl:525` に 1 件 |
| tla-evidence.ts:434 `DEFAULT_STORE_ROOT = "specs/tla-evidence"` | 再現 | 同所。`specs/tla-evidence/` 実体は observed SHA に未生成 |
| tla-authoring.ts:449 `DEFAULT_SUBJECTS_PATH = "specs/tla/authoring-subjects.json"` | 再現 | 同所 |
| t113/t320/t382/t415 も specs/tla fixture を直接書く | 再現 | t113.test.ts:4、t320:9(fixture write は :67-70)、t382:18、t415:4(ヒット行数) |
| dist 477/138、全域 826/264 | 再現 | `grep -ro "specs/tla" dist/ \| wc -l` → 477、`-rl` → 138;`git grep -o … HEAD \| wc -l` → 826 |
| ベースライン t402=19 / t403=12 / model-map-v2=27 pass | 再現 | 上記 Test Coverage 表。登録テスト 7 pass も green |

**再現できなかった claim**: なし。ただし以下の前提誤りを訂正する:
1. タスク指示の runner パス `scripts/ci-model-check-domain.ts:189` → 正しくは `plugins/formal-model-check/tools/ci-model-check-domain.ts:189`(`scripts/` の `specs/tla` ヒットは 0 件)
2. `repositoryModelMap()` はライブラリ API ではなく t-formal-verif-mirror-model-registration.integration.test.ts:24 のテストローカルヘルパー

## 移設で変更が必要なファイル(変更クラス別)

### A. move(git mv — 内容は原則不変)

- `specs/tla/` 配下 9 ファイル → `amadeus/spaces/<space>/specs/tla/`(FormalElection.{tla,cfg}、MirrorLifecycle.{tla,cfg}、MirrorLifecycleAsImplemented.{tla,cfg}、MirrorLifecycleCore.tla、MirrorLifecycleVacuity.cfg、model-map.json)。未登録 2 資産(AsImplemented.{tla,cfg}、Vacuity.cfg)も watch glob 対象であり同梱が自然(登録方針の維持は t-formal-verif-mirror-model-registration:106 が guard)
- `specs/tla/` 内コメントの自己参照 5 行(MirrorLifecycle.cfg:2、MirrorLifecycle.tla:8、MirrorLifecycleAsImplemented.tla:17、MirrorLifecycleCore.tla:11,539)は内容変更を伴う

### B. path-rewrite(ソース定数・文言)

- `packages/framework/core/tools/amadeus-formal-verif-model-map.ts`(:53-55,:59,:63,:143,:250,:272)
- `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`(同上。core 編集後に byte-identical 再生成 — `scripts/package.ts:808-809`、guard: t-package-generated-plugin-sources)
- `packages/framework/core/tools/amadeus-plugin-activation.ts`(:41-42,:92-102 コメント,:229,:231,:233,:304-305)
- `packages/framework/core/tools/amadeus-sensor-model-completeness.ts`(:37 ほか定数経由全面、:507,:535,:760)
- `packages/framework/core/tools/amadeus-advisory-choice.ts`(:894-895)
- `packages/framework/core/tools/tla-module-deps.ts`(:4,:38,:59)
- `packages/framework/core/sensors/amadeus-model-completeness.md`(:8 matches glob — 実装側エントリ `amadeus-election*.ts` / `amadeus-mirror-*.ts` は動かさない非対称編集、:24)
- `plugins/formal-model-check/tools/tla-model-loader-internal.ts`(:186,:344,:364,:367,:371)
- `plugins/formal-model-check/tools/tla-module-deps.ts`(:4,:38,:59)
- `plugins/formal-model-check/tools/ci-model-check-domain.ts`(:189 — Docker bind mount src/dst 双方)
- `plugins/formal-model-check/tools/run-model-check-diagnostic.ts`(:217)
- `plugins/formal-model-check/tools/tla-applicability.ts`(:361)
- `plugins/formal-model-check/tools/tla-authoring.ts`(:449)
- `plugins/formal-model-check/tools/tla-evidence.ts`(:434 — **個別判断**: `specs/tla-evidence` は機械置換に追従しない別 root。watch glob 外に置く ADR(260804-tla-authoring)との整合も考慮)
- `plugins/formal-model-check/stages/formal-model-check.md`(:12,:34,:45-46)
- `plugins/formal-model-check/README.md`(:16,:70,:91)

### C. digest re-pin

- `specs/tla/model-map.json`(:7,:11,:60,:64,:69 の `path` 値)。`identity` はコンテンツ base の canonical ハッシュのためパス移動では変わらないが、`path` 書換後に v2 validator(:250)の新正準パスへの適合確認と、activation watch の spec hash drift が必ず発生する(設計どおり。「落ちる実証」で閉じる対象)

### D. docs

- `docs/reference/21-formal-model-following.{md,ja.md}`(:10-11,:28,:53 / ja :10,:18,:31)
- `docs/reference/22-formal-model-supply.{md,ja.md}`(:3,:95,:190,:223,:238 / ja :3,:50,:98,:112,:121)
- `docs/reference/07-sensor-system.{md,ja.md}`(:206 / ja :205)
- `docs/guide/19-plugins.{md,ja.md}`(:284 / ja :268)
- `docs/amadeus-files.{md,ja.md}` — `specs/tla` 参照は 0 件だが `amadeus/spaces/<space>/` layout 定義(:152-176 付近)へ `specs/` エントリの**新規追記**が必要

### E. test fixture / 期待値

- 上記「テストファイル別ヒット数」の 51 ファイル(unit 16 / integration 30 / e2e 2 / support 2 / harness 1)。代表: `tests/harness/formal-model-fixture.ts:11-12`、`tests/formal-verif/support/tla-toolchain-harness.ts:54`、`tests/integration/t320-activation-spec-hash.integration.test.ts:67-70`、`tests/integration/t382-activation-real-layout-spec-root.integration.test.ts`(実レイアウト fixture、18 行)

### F. no-change-needed(変更不要・触ってはいけない)

- `.github/workflows/ci.yml` — `specs/tla` リテラル 0 件。runner コード側の修正で追従
- `scripts/package.ts` / `scripts/promote-self.ts` / `scripts/` 全面 — `specs` 参照なし(specs/ は dist に投影されない設計)
- `.gitignore` — specs 関連エントリなし(必要になれば新設だが現状は不要)
- `dist/` — gitignore 済み生成物。`bun run build` で再生成(477/138 の焼き込みはこれで追従)。直接編集・コミット不可
- `amadeus/spaces/default/intents/**`(141 ファイル、うち audit jsonl 14)、`amadeus/spaces/default/elections/**`(30 ファイル)— **歴史記録。書換禁止**(過去の advisory 文言・設計記録は当時の事実として残す)
- `amadeus/spaces/default/memory/project.md:408` — learned エントリは過去の実測記録。書換ではなく、必要なら新規 cid の追記で対応
- `amadeus/spaces/default/codekb/**`(12 ファイル)— 派生キャッシュ。本 RE を含む次回スキャンで再導出

## Open questions(設計段へ引き渡し)

1. **active-space 解決規則**: どの space の `specs/tla` を watch・実行対象にするか(active-space カーソル連動? explicit 指定?)。現行コードに機構なし(reviewer-1 未解決1 と一致)
2. **`specs/tla-evidence` の扱い**: 移設対象に含めるか。含める場合の watch glob 外 ADR との整合
3. **watch 基底の再宣言**: `specRootForHost = dirname(hostRoot)`(プロジェクトルート)のまま glob だけ `amadeus/spaces/<space>/specs/tla/**` に変えるか、所有ルートを space 配下へ再宣言するか — cid:code-generation:cg-watch-root-separation の解釈を設計段で明示
4. **複数 space 時の model-map 解決**: space 切替で map・digest pin・sensor の対象がどう切り替わるか
