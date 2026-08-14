# Components — 260814-plugins-rename-drift

上流入力: `inception/requirements-analysis/requirements.md`(FR-REN/SET/DRIFT/X)、codekb `architecture.md` 260814 節(患部 P1〜P5)、codekb `component-inventory.md` 260814 節(pr-convergence の宣言構成)。裁定は `application-design-questions.md` Q1〜Q7。

## C1: github-pr-convergence プラグイン(改名 — FR-REN-1〜6)

- 目的: 既存 pr-convergence プラグインの依存軸プレフィックス改名。**挙動変更なし**。
- 責務: 従前どおり(PR 収束ステージ + report-format センサー + ツール 10 本)。
- 境界: `plugins/github-pr-convergence/`(13 ファイル、`git mv`)。`plugin.json` の `name` = `github-pr-convergence`(compose の name=ディレクトリ検証 `amadeus-plugin-compose.ts:344` に適合)。
- 不変 API 面: ステージ slug `pr-convergence`、センサー id `pr-convergence-report-format`、スキル名 `/amadeus-pr-convergence`、ツールファイル名 `pr-convergence-*.ts`(FR-REN-5)。
- 同期面(同一 PR): `amadeus/config.json` の `plugin.activation.names` 要素と `plugin.scope-bindings` の**外側キーのみ**(内側のステージ slug キーは不変)、docs 06-sensors en/ja のプラグイン名言及、テスト 20 件のパス参照、coverage allowlist / complexity baseline のパスピン、fixtures README。`tests/fixtures/pr-convergence/` ディレクトリ名は維持(Q2=A — 不変ステージ slug に整合)、`t445:52` の `PLUGIN` 定数は `"github-pr-convergence"` へ追随。

## C2: plugin.settings 宣言パーサ(core — FR-SET-1/4)

- 目的: plugin.json の `settings` スキーマ宣言(optional トップレベルキー)の parse と fail-closed 検証。
- 責務: キー名(機密パターン拒否)・型(閉語彙: string/number/boolean/enum)・デフォルト値の宣言検証。宣言側の綴り誤り対策として settings キー実在検査を実装(未知トップレベルキーの全面検査は既存 advisories 二重パーサ構造の是正を伴うため、settings 導入に必要な範囲 = `settings` の誤綴り検出に絞る — ADR-3)。
- 境界: `packages/framework/core/tools/amadeus-plugin-compose.ts` の `parsePluginManifest`(:345-351 の並びに `parseSettings` を追加)。optional のため既存 3 プラグインの manifest は byte-identical のまま。

## C3: plugin.settings config キー(core — FR-SET-2/3)

- 目的: `plugin.settings.<plugin-name>.<key>` の階層解決(project → space → intent)と fail-closed 検証。
- 責務: `AmadeusConfigKey` union へ `"plugin.settings"` を 1 キー追加、`AMADEUS_CONFIG_REGISTRY` エントリ(layers = project/space/intent — 既存 `plugin.*` 2 キーの project-only と異なり、settings は実行時値のため 3 層。ADR-3 に根拠)、`parsePluginSettings`(`parsePluginScopeBindings` :497-521 と同型の 3 段ネスト検証 + 機密キー名パターン拒否)。未知パス検出は registry 追加で `CONFIG_LEAF_PATHS` へ自動追随(:637-644)。
- 境界: `packages/framework/core/tools/amadeus-config.ts` + docs 2 本(t432 逐語一致ガードが強制)+ ja 対訳。

## C4: 設定解決・受け渡し(core — Q7=A、FR-DRIFT-2 の接続面)

- 目的: センサー起動時に、plugin.json 宣言デフォルト + config 階層 override を fail-closed で解決し、プラグインスクリプトへ引数として渡す。
- 責務: `amadeus-sensor.ts fire` が composition record からセンサー所有プラグインを特定し、当該プラグインの settings を解決して `--setting <key>=<value>` 引数群(または単一 `--settings-json`)で子プロセスへ渡す。プラグインは core を import しない(本 intent の ADR-6 に採録した既存機構制約 — 正本は `scripts/import-closure-guard.ts` の fail-closed ガードと `plugins/pr-convergence/tools/pr-convergence-cli.ts:20-22` のコード内コメント)。
- 境界: `packages/framework/core/tools/amadeus-sensor.ts`(spawn 面 :569 周辺)。settings 未宣言プラグインのセンサーは従前どおり引数なし(後方互換レイヤーではなく、宣言が無ければ渡す物が無いという自然な不在)。

## C5: git-drift プラグイン(新設 — FR-DRIFT-1〜6)

- 目的: origin 進行の早期検知センサー。stage-less(`"stages": []`)+ sensors + seams の合成形状(spike で構造的処理可能を確認済み)。
- 構成:
  - `plugins/git-drift/plugin.json` — name / stages:[] / seams(`code-generation` と `build-and-test` の sensors seam へ `git-drift` を注入 — Q4=A)/ sensors(`sensors/amadeus-git-drift.md`)/ tools(`tools/amadeus-sensor-git-drift.ts`)/ settings(`fetch-throttle-seconds` 等の宣言)
  - `sensors/amadeus-git-drift.md` — id `git-drift`、`default_severity: advisory`、`matches` は広め(ステージ作業ファイル全般)、`timeout_seconds` 宣言
  - `tools/amadeus-sensor-git-drift.ts` — 検知実装(behind 数 + 交差判定 + スロットル + fail-open)
- 配布: 既存 3 プラグイン同型の opt-in(Q6=A)。本 workspace は `plugin.activation.names` へ `git-drift` 追加。stage-less のため `plugin.scope-bindings` エントリ不要(scope-grid に一切触れない)。
- 検証: t341 conformance journey は fixture 固定で新形状被覆外のため、stages:[]+sensors+seams 形状の conformance ケースを追加(spike 弱点 1 の手当て)。

## C6: 検証・同期面(横断 — FR-X)

- scope-grid 不変検証: 改名 PR で config 同期漏れ時にステージがスコープ行から脱落することを検出するテスト(Q1=A の落ちる実証)。
- 残存参照検査述語(FR-REN-6)、落ちる実証群(FR-SET-3/4、FR-DRIFT-3/5)、lint/型検査配線(FR-X-2)。

## 規模見積り(数値 — inception ガードレール準拠)

| コンポーネント | 推定規模(行) | 内訳・根拠 |
|---|---|---|
| C1 改名 | 変更 ~450 行(+ `git mv` 13 ファイルは移設で行数変化なし) | plugin.json name 1 行、config.json 2 キー、docs en/ja 2 行、テスト 20 件のパス文字列 ~40 箇所、allowlist/baseline パスピン 10 件、t445 定数 1 行、README ~5 行、scope-grid 検証テスト新規 ~150 行、残存参照検査の除外根拠記録 ~30 行 |
| C2 宣言パーサ | 新規 ~120 行 + テスト ~200 行 | parseSettings 本体 ~80、誤綴り実在検査 ~20、型定義 ~20。落ちる実証(綴り誤り loud)含む |
| C3 config キー | 新規 ~150 行 + テスト ~250 行 + docs 4 面 | union 1 行、registry エントリ ~15、parsePluginSettings ~90(scope-bindings 同型)、resolvedConfig 面 ~20、docs は t432 強制の 2 本 + ja 2 本 |
| C4 解決・受け渡し | 新規 ~130 行 + テスト ~200 行 | resolvePluginSettingsForSensor ~90、spawn 面の argv 付与 ~20、失敗時 loud 記録 ~20 |
| C5 git-drift | 新規 ~450 行 + テスト ~450 行 | plugin.json ~40、sensor md ~15、detectDrift 実装 ~250(スロットル ~50・交差判定 ~90・git 実行 ~60・報告整形 ~50)、fail-open 経路 ~50。テストは 3 経路の落ちる実証 + 非 git 不発火 + スロットル設定消費 |
| C6 検証面 | 新規 ~250 行 | conformance ケース(stages:[]+sensors+seams)~150、seam/manifest id 不一致の失敗様式固定 ~50、lint/型検査配線は設定行のみ ~10 |

合計概算: 新規 ~1,100 行 + テスト ~1,100 行 + 変更 ~450 行。intent-backlog の PU-1(~400)/PU-2(~1,100)/PU-3(~900)と整合(PU-2 = C2+C3+C4、PU-3 = C5+C6 の git-drift 分)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:24:26Z
- **Iteration:** 1
- **Scope decision:** none

ADR-6への壊れた相互参照(自身のdecisions.mdに不在、codekb内の同名ADR-6は無関係の別intent)とコンポーネント規模の数値見積り欠落(inception.md MANDATORY違反)によりNOT-READY。

### Findings

- BLOCKER | components.md(C4)/component-dependency.md/memory.mdが3箇所で引用する「ADR-6(プラグインはcore importしない)」が、この intentのdecisions.md(ADR-1〜ADR-5のみ)に存在しない。codekb/amadeus/architecture.md:4055に見つかる唯一のADR-6実体は無関係の別intent(260723-t241-ci-residency)の決定であり、core import禁止の典拠として誤り。実装者が根幹制約の正本を成果物から辿れない。
- BLOCKER | amadeus/spaces/default/memory/phases/inception.md Architecture Standardsが要求する『各ユニットの推定規模を数値(行数見積り)で記録』が、components.md/component-methods.md/services.md/decisions.mdのいずれにも存在しない。C1〜C6全コンポーネントについて定性記述のみで規模正当化が数値化されておらず、ガードレール違反。
- FOLLOW-UP | ADR-5のfetch-throttle-seconds既定値600は、requirements.md Open Question 7(観測レンジ内側での設計段決定)の要求に反し、ADR-5自身が『code-generation段で実測レンジを確認して確定』と記して実質的に再度先送りしている。
- NIT | decisions.mdヘッダが『裁定はQ1〜Q7』と記すが、ADR-3内にQ3とQ7が混在するなど、ADRとOpen Questionの対応が1:1でない箇所があり対応表があると追跡しやすい。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T08:28:04Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の両 BLOCKER(ADR-6 の壊れた相互参照、規模数値の欠落)は decisions.md の ADR-6 新設と components.md の規模見積り表で実測解消を確認し、C4/component-dependency.md からの参照も一貫している。

### Findings

- FOLLOW-UP | components.md 末尾の規模見積り表が『intent-backlog の PU-1(~400)/PU-2(~1,100)/PU-3(~900)と整合』と述べるが、本レビューの読取許可範囲(components.md/component-methods.md/services.md/component-dependency.md/decisions.md、requirements.md、codekb architecture.md/component-inventory.md)のいずれにも PU-1〜PU-3 や intent-backlog という語は出現しない(grep 0 hit)。参照先が本 intent の application-design 段の consume 対象外(delivery-planning 段や roadmap.md 等の別成果物)である可能性はあるが、この記載だけでは実装者が整合を検証できない — 次段(delivery-planning)着手前に intent-backlog 側の該当数値を明記するか、参照を削除する
- NIT | ADR-5 の変更で『既定値600秒は設計段確定・code-generation段は再裁定でなくNFR-1検証』という位置づけは明確になったが、『実測が既定値の不当性を示した場合のみ設計逸脱として梯子へ戻す』の具体的な閾値(何が『不当性』の基準か)は本 ADR にまだ数値化されていない。次段での実測結果と照合する際に、実装者が『これは想定内実測か、それとも設計逸脱に該当するか』を独力で判定できるよう、簡潔な数値基準(例: 実測 fetch 所要時間が throttle 間隔の何%を超えたら要再検討、等)を添えると尚良い
