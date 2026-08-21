# 依存関係

## Internal Dependency Graph

```text
amadeus/config.json
  -> amadeus-graph.ts
  -> compiled scope-grid.json / stage-graph.json
  -> amadeus-orchestrate.ts
  -> plugins/github-pr-convergence/stages/pr-convergence.md

plugins/github-pr-convergence/plugin.json
  -> amadeus-plugin.ts compose/drop
  -> code-generation.produces += pr-convergence-report
  -> orchestrator per-unit coverage
  -> amadeus-state.ts completion guards

pr-convergence-cli.ts
  -> pr-convergence-gh-runner.ts -> gh -> GitHub
  -> pr-convergence-predicate.ts
  -> pr-convergence-ledger.ts
  -> pr-convergence-provenance.ts
  -> pr-convergence-presentation.ts
  -> record filesystem

pr-convergence-report.md
  -> report-format sensor
  -> artifact coverage/state completion
```

## Issue #3029 の依存差分

```text
plugin sensor manifest (blocking)
  -> compiled stage graph (severity)
  -> PostToolUse sensor dispatcher
      -> per-sensor script exit status
      -> SENSOR_PASSED / SENSOR_FAILED audit row
  -> amadeus-state evaluateBlockingSensors
      -> approve completion guard
```

exit 127 の現在の依存は `amadeus-sensor.ts:772-778` が `tool-unavailable` を pass note にすること、`amadeus-state.ts:2008-2014` が `script-error:` だけを blocking refusal にすること、そして plugin manifest が blocking severity を宣言することの組み合わせで成立する。Bun の spawn failure は branch 0 の `script-error: spawn-failed` であり、exit 127 のツール欠如シグナルとは独立している。

変更影響は方針で分岐する。fail-closed なら dispatcher の event kind/note は維持して guard predicate と finding/テスト期待値を変える案、または dispatcher の terminal event を変える案があり、audit-format との互換性を requirements で決める必要がある。pass 維持なら gate の「blocking」は script availability を含まないと明示し、plugin schema と audit-format の説明を同期する必要がある。

## External Dependencies

| Dependency | Usage | Failure Mode |
|---|---|---|
| GitHub | PR state、checks、review threads、PR creation | unavailable/rate limit/API error で exit 2 |
| `gh` CLI | authenticated GitHub process adapter | absent/unauthenticated で runner を作らない |
| local filesystem | state、audit、report、compiled graph | absent/malformed artifact で refusal または parse failure |
| Bun runtime | TypeScript CLI/test execution | runtime unavailable で tooling 停止 |

## Coupling and Direction

- host config は plugin 名/stage slug を知るが、plugin 内部実装を知らない。
- core graph/state は artifact 名と sensor severity を知るが、GitHub convergence 意味論を知らない。
- plugin は core implementation を import せず、`amadeus-log` を process boundary で呼ぶ。
- report sensor は CLI renderer を import せず、独立 parser で format drift を検出する。

## Critical Dependency Gaps

1. **CLI → receipt**: report write と同時に durable execution receipt を生成する edge がない。
2. **receipt → audit**: report digest、PR/head identity、CLI invocation identity を audit event に結ぶ edge がない。
3. **audit → completion**: state guard が receipt/digest/event を照合する edge がない。
4. **local branch → GitHub head**: `create` が local commit、remote ref、GitHub PR head SHA を比較する edge がない。
5. **sensor → stage**: sensor manifest は存在するが、stage は `sensors: []`、severity は advisory で blocking edge がない。

## Change Impact

attestation を追加すると、report schema、CLI writer、sensor/validator、audit contract、state completion guard、tests の同時変更が必要になる。scope binding 自体は独立しており、非 self-* opt-in contract を変更する必要はない。
## 差分リフレッシュでの依存変化（260813-advisory-requestion-fix、履歴、observed `c0f9edf27`）

**観測 ref**: base `854692fd7a11b124236b0427fe3d59e2fe6bf785` → observed `c0f9edf27828def6fa3dbbbc4101d753b398e025`。

- **外部依存の変化なし**: `package.json` / `bun.lock` はいずれも本区間で無変更（`git diff --name-only 854692fd7..c0f9edf27 -- package.json bun.lock` が空出力）。
- `mise.toml` に開発ツールの追加（`@openai/codex 0.146.0` / `takt 0.58.0`）。runtime dependency ではない。
- `amadeus/config.json` の `plugin.activation.names` に `coverage-patch-quick` を追加 — 有効プラグインは計 3（`coverage-patch-quick` / `formal-model-check` / `pr-convergence`）。

### Issue #2967 患部の依存エッジ

```text
amadeus-orchestrate.ts (applyPendingAdvisoryGuard :826-874)
  -> amadeus-advisory-choice.ts (guardAdvisoryChoices :716 -> evaluateAdvisoryHold :402 -> resolveRunRequiredHold :682)
  -> amadeus-intent-autonomy.ts (resolveAdvisoryChoiceAutonomously / decisionId :840-845)
  -> amadeus-advisory-choice.ts (recordAdvisoryChoice :866, boolean)
  -> amadeus-directive.ts (AwaitAdvisoryChoiceDirective :228-235)
  -> harness skill 散文（run_required / formal_checks を消費する指示、8/8 で drift）
```

欠けているエッジは **`recordAdvisoryChoice` → 呼び出し側への失敗理由**（現状は `boolean` 1 本）と、**run-now 裁定 → hold 解除**（`resolveRunRequiredHold` に実行 route が無く、解除は宣言プラグインの評価器のみ）である。
## Issue #2813 依存グラフ（履歴、observed `c0f9edf2782`）

```text
amadeus-election.ts (CLI/state machine)
  -> amadeus-election-model.ts (definition/ballot/resolution/tally)
  -> amadeus-election-store.ts (filesystem/pending/ledger/tally/registry)
       -> amadeus-election-model.ts
  -> amadeus-election-record.ts (ruling/GoA/reservation/verify)
       -> amadeus-election-model.ts
  -> amadeus-election-transport.ts (agmsg/subagent delivery port)

scripts/amadeus-election-migrate.ts
  -> store + CLI verify + git history

FormalElection.tla + FormalElection.cfg
  <-> model-map.json
  -> identity of model / record / store / transport / CLI

amadeus-election/SKILL.md
  -> CLI directive and flag vocabulary
```

### Cardinality による結合

`Election.question` → `DistributionView.question` → ballot scalar fields → `resolveBallots(voter)` → `TallyResult` 1件 → `tally.json.result` → global `hold` directive → ruling/GoA 1組、という連鎖がある。途中の1面だけを複数化すると、下流が問への帰属を失うか、既存 reader が新 JSON を無検査 cast する。

変更依存の最小 DAG は次のとおりである。

1. stable question ID を含む canonical domain schema と legacy decoder。
2. `voter × question` resolution、question tally、mixed result、established preservation。
3. store materialization と typed tally read。
4. CLI status/directive/hold resolution と skill vocabulary。
5. record/verify と transport view。
6. migration fidelity、TLA+ invariant、model-map identity、現行 team norm。
7. build、targeted tests、full CI gates。

外部依存は Bun、local filesystem、agmsg send script、subagent spawn、形式検証時の TLC toolchain に限られる。選挙の集計自体に network service はなく、後方読み取りのための新サービスやdatabaseを導入する必要はない。

## Issue #2985 依存グラフ（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

```text
units-generation dependency data
  -> runtime DAG compiler
  -> orchestrator / swarm Unit batches
  -> per-unit code-generation paths
  -> PR convergence CLI
       -> provenance
       -> git runner / GitHub runner
       -> attestation / audit receipt
  -> report format sensor
  -> state completion guard

delivery-planning bolt-plan -X-> runtime DAG / PR convergence identity
```

`bolt-plan.md` から runtime execution identity への依存 edge がないことが欠落 seam の起点である。runtime は Unit dependency DAG を読み、PR convergence は caller が渡す単一 `bolt` / `unit` を検証するが、その `bolt` が plan 上の `units[]` を所有することを保持・検証しない。

外部依存は Bun、Git、GitHub CLI / API、filesystem、Node crypto であり、新規外部依存は要求されていない。内部 coupling は、Delivery Bolt が複数 Unit、runtime batch が topological Unit 集合、PR evidence が単数 Unit という cardinality と、state sensor guard が各 Unit path、one-Bolt-one-PR が共有 PR を owner とする ownership の2点にある。候補Aでは plan/runtime/CLI/sensor/state に共通 Bolt identity edge を追加し、候補Bでは Delivery Planning の出力制約を単数へ合わせる。選択は requirements に保留する。

## 260814-open-bug-batch-6 の依存グラフ（履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### 外部依存

変化なし。`git diff 1d08374cd..a49f9e9fd -- package.json` は**空**。

### プラグイン境界の依存（本区間で動いた面）

`plugins/pr-convergence/` → `plugins/github-pr-convergence/` の rename により、プラグイン名を鍵にする消費者が同一変更で追随している。実測した追随先:

- `amadeus/config.json` — `plugin.activation.names` の要素と `scope-bindings` のキー（`pr-convergence` → `github-pr-convergence`。`git-drift` も同時に names へ追加）
- `docs/harness-engineering/06-sensors.md` / `.ja.md` — センサー表の説明文中のプラグイン名

**stage slug `pr-convergence` は不変**であるため、slug を鍵にする面（`scope-bindings` の内側のキー、ステージグラフ）は追随不要だった。プラグイン名と stage slug が別々の鍵として機能している点は、rename 系の変更を設計する際の前提になる。

### #3062 の依存エッジ

```
pr-convergence-cli.ts  ──(evaluate)──>  pr-convergence-predicate.ts
        │                                    │ landedVerdict: converged=false, verdict="landed"
        │ :823/:1260/:1364 で landed を拒否
        ▼
  self report 書込 (なし)
        │
        ▼
amadeus-sensor-pr-convergence-report-format.ts
        │ :368-372 kind==="landed" を stage 非依存で拒否
        ▼
  blocking sensor 未解決 → amadeus-state.ts approve 拒否
```

predicate は landed を第一級 verdict として表現できるのに、その下流の CLI とセンサーが揃って拒否する**表現力の非対称**が本 Issue の依存構造上の核である。

### #3026 の依存エッジ

`plugins/formal-model-check/plugin.json`（宣言）→ `amadeus-plugin-compose.ts` の `parseSensors`(`:361`) → `ownedPaths`(`:956`) / 投影(`:992` / `:1023`) → `.claude/sensors/`。宣言側のエッジが欠けており、`?? []` フォールバック 4 箇所が欠落を無音化している。**データ（宣言）が依存グラフの起点である**ため、コード側に欠陥はない。

### #3032 の依存エッジ

`amadeus-lib.ts:8066 emitErrorAuditRow` → （遅延 `require`）→ `otel/audit-emit.ts:48 emitAuditEvent` → `otel/bootstrap.ts:88 ensureOtelBootstrap` → `:45 assertSameProject`。lib ↔ otel の循環を `require` で切っている（`amadeus-lib.ts:8061-8065` のコメントが根拠）。この循環回避が、宛先決定の追跡を静的に難しくしている一因である。

## 差分リフレッシュでの依存変化（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`（23 コミット、`git rev-list --count 1d08374cd..HEAD`）。

- **外部依存の変化なし**: `package.json` / `bun.lock` は本区間で無変更（`git diff --name-only 1d08374cd..HEAD -- package.json bun.lock` が空出力）。Bun `1.3.13`（`bun --version`）、TypeScript `^6.0.3`、`fast-check ^4.9.0` はいずれも据え置き。
- **有効プラグインは 4**（`coverage-patch-quick` / `formal-model-check` / `git-drift` / `github-pr-convergence`）。取得コマンド: `ls plugins/`（4 ディレクトリ）および `amadeus/config.json` の `plugin.activation.names`（同じ 4 要素、順序も一致）。前区間の 3 から `git-drift`（新設、PR #3055）が加わり、`pr-convergence` は `github-pr-convergence` へ rename された（PR #3051）。プラグイン**数**の増分は +1 であり、rename は数に影響しない。
- **新規の内部依存エッジ — plugin.settings**（PR #3052、`packages/framework/core/tools/amadeus-plugin-settings.ts` +274）:

```text
amadeus/config.json  plugin.settings（3 レイヤ project -> space -> intent、
                     amadeus-config.ts:649-655 の registry entry、merge: "plugin-settings"）
  -> amadeus-config.ts resolveAmadeusConfig
  -> amadeus-sensor.ts pluginSettingsOverrides (:324)
  -> amadeus-sensor.ts resolvePluginSettingsForSensor (:291)
       -> plugin の staged manifest（plugin.json の settings 宣言）
       -> amadeus-plugin-settings.ts parseSettingsDeclaration -> resolvePluginSettings (:240)
  -> sensor script への process boundary 引き渡し（plugin は core を import しない = ADR-6 維持）

amadeus-plugin-compose.ts (:362-363)
  -> parseSettingsDeclaration / collectSettingsMisspellings（compose 時の宣言検査）
```

このエッジは既存の「plugin は core implementation を import しない」方向を壊さない。宣言は plugin 側、override は config レイヤ、突き合わせは core の 1 点（`resolvePluginSettings`）に閉じており、未宣言キー・型不一致・enum 範囲外はいずれも `ok: false` で**拒否**する（default へ落とさない fail-closed）。

- **git-drift の依存**: `plugins/git-drift/plugin.json` は `stages: []` の tool-only プラグインで、`code-generation` と `build-and-test` の `sensors` seam に `git-drift` を追加する。settings は `fetch-throttle-seconds`（number、default 600）1 件で、上記 plugin.settings 機構の最初の実消費者である。外部依存として `git`（origin fetch）を使う。

## 区間の依存エッジ変化と、患部まわりの依存方向（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**外部依存の変化なし**（`git diff --stat 9ba8170bb 78146f435 -- package.json bun.lock '**/package.json'` の出力は空）。内部エッジで動いたのは 1 本 — `amadeus-graph.ts` が plugin host ディレクトリの sensor をマージする読み取りエッジを獲得した（`mergeSensorsFromDir`、#3026 の着地）。

患部まわりの依存方向は区間内で無変更（`git diff --quiet` を 5 パスへ適用し全件 exit 0）。方向は次のとおりで、**`amadeus-orchestrate.ts` だけが 2 つの読み口の両方に依存している**のが本 intent の構造的争点である。

```
amadeus-orchestrate.ts
  ├─ import :237  foldUnitPoolEventSets        ← amadeus-unit-pool.ts
  ├─ import :238  readUnitPoolEventSetsFromAudit ← amadeus-unit-pool-runtime.ts   … 狭い読み口（1 イベント）
  ├─ import :250  createAuditUnitPoolRepository / createUnitPoolCoordinator ← amadeus-unit-pool-runtime.ts
  ├─ import :253-254 normalizeConstructionOutcomeAudit / projectConstructionOutcomes
  │                                            ← amadeus-construction-outcome-projection.ts … 正準射影（5 イベント）
  └─ → amadeus-per-unit-consume-fanout.ts（母集団を渡す消費側）

amadeus-swarm.ts → amadeus-unit-pool-runtime.ts（pool の唯一の変異源、9 call site）
```

テキストフォールバック: `amadeus-orchestrate.ts` は unit pool 系（`amadeus-unit-pool.ts` / `amadeus-unit-pool-runtime.ts`）と正準射影（`amadeus-construction-outcome-projection.ts`）の**両方**を import し、前者だけを per-unit fanout の母集団に使っている。`amadeus-swarm.ts` は pool runtime の唯一の変異源。`amadeus-per-unit-consume-fanout.ts` は母集団を受け取るだけで、どちらの読み口にも直接依存しない（＝**是正で依存方向を増やさずに読み口を差し替えられる位置にある**）。

## 区間の依存エッジ変化と、患部まわりの依存方向（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**外部依存の変化なし**（`git diff --stat 78146f435a 83e1dbeef -- package.json bun.lock '**/package.json'` の**出力は空**）。内部エッジの変化も本 intent の患部には及んでいない — `git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**。

患部まわりの依存方向は次のとおりで、**拒否が verb 分岐より上流の 1 点に集中している**のが本 intent の構造的争点である。

```
pr-convergence-cli.ts  runCli
  ├─ :1370  selfContextFor ─→ :627 currentSelfContext ─→ :714 attestationBindsIdentity
  │           （head 束縛。ここで拒否が確定する）          ↑ receipt.prHead === heads.prHead
  ├─ :1398  verb 分岐 ─→ reportOutcome (:1256) ─→ :597-604 transitionAllowed
  │           （created → landed の許可はここ。上流で拒否されると到達しない）
  └─→ pr-convergence-gh-runner.ts:322 fetchOpenPrForHead（--state open のみ）

amadeus-sensor-pr-convergence-report-format.ts:391-393 / :289
  → record を読むだけ（CLI へは依存しない、独立の blocking 判定）
```

テキストフォールバック: `runCli` は `selfContextFor`（`:1370`）を verb 分岐（`:1398`）より**先に**呼ぶ。`selfContextFor` は `currentSelfContext`（`:627`）経由で `attestationBindsIdentity`（`:714`）へ至り、そこが `receipt.prHead === heads.prHead` を要求する。`created → landed` を許可する `transitionAllowed`（`:597-604`）は verb 分岐の下流にあるため、head 前進時には到達しない。`fetchOpenPrForHead`（gh-runner `:322`）は open PR だけを引くので MERGED PR の read-back 経路が存在しない。blocking sensor は CLI に依存せず record を直読するため、**CLI 側だけを直しても record を landed にしない限り sensor は赤のまま**である（＝是正は record の中身を変える方向でなければ閉じない）。

機序は `architecture.md`、patch surface は `code-structure.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## 区間の依存エッジ変化と、オープンバグ 3 件の依存方向（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**外部依存の変化なし**（`git diff --stat 83e1dbee..HEAD -- package.json bun.lock '**/package.json'` の**出力は空**）。内部エッジは新規 core tool 5 本の分だけ増えた（本節の実測: 各ファイルの `from "..."` を列挙）。

| 新規モジュール | 依存先 |
|---|---|
| `amadeus-recommendation.ts` | **なし**（葉。裁定語彙の型と codec だけを持つ） |
| `amadeus-waiting.ts` | `./amadeus-recommendation.ts`、`node:crypto` |
| `amadeus-autonomy-status-facet.ts` | `./amadeus-config.ts`、`./amadeus-intent-autonomy.ts`、`./amadeus-intent-autonomy-production.ts`、`./amadeus-mirror-types.ts` |
| `amadeus-completion-report.ts` | `./amadeus-autonomy-review.ts`、`./amadeus-autonomy-review-production.ts`、`./amadeus-intent-autonomy.ts`、`./amadeus-intent-autonomy-replay.ts`、`./amadeus-lib.ts`、`node:fs`、`node:path` |
| `amadeus-merge-provenance.ts` | `./amadeus-audit.ts`、`./amadeus-lib.ts`、`./amadeus-observability.ts` |

依存方向は**語彙（`amadeus-recommendation.ts`）→ 機構（`amadeus-waiting.ts`）→ 投影（facet / report）**の一方向で、逆流と循環は無い。`amadeus-recommendation.ts` が葉であることが、裁定語彙を他の機構から独立してテストできる形を担保している。

### 本 intent の 3 領域の依存方向

```
A. #2363 — self-install 配布経路（3 定義が並列、単一正本が無い）
   scripts/plugin-projection.ts:44-53  PACKAGE_HARNESSES (8, pi 在)
   scripts/plugin-projection.ts:59     SELF_INSTALL_HARNESSES (5, pi 不在)
        ├─→ scripts/promote-self.ts:327-329  packageFreshnessArgs → /amadeus --doctor
        └─→ t531:143-148  「self-install ⊆ package」のみ検査（逆向き無し）
   scripts/promote-self.ts:64-71       managedDirs (6, pi 不在) …独立の手書き写像
   .../data/self-install-allowlist.ts:12-19  GENERATED_SELF_INSTALL_ROOTS (6, .pi 不在)
        └─→ .gitignore / .gitattributes（生成）

B. #2162 — no-silent-drop（分岐で検証到達性が変わる）
   .github/workflows/ci.yml:164 → bun run no-silent-drop
        └─→ bootstrap.ts:435-461 loadTrustedPreviousLedgers
              ├─ events/ 在 → :449 assertStrictAncestorOfHead   ← 通常経路
              └─ events/ 不在 → :451 validateBootstrapHistory    ← 潜在（到達しない）
                    └─→ :352-356 preRevision のみ到達性検査
                    └─→ :358 → :283 postRevision は文字列等値のみ
   ledger.ts:226-227 baselineAtRevision（不在ファイル参照、常に throw）
        └← no-silent-drop-gate.test.ts:839 のみが呼ぶ（production から呼出なし）

C. #3097 — センサー docs（導出可能なのに手書き、検査は片方だけ）
   packages/framework/core/sensors/ (11) + plugins/*/plugin.json sensors (3)
        └─→ t3028:20-45 derivedCorpus() (14)
              └─→ t3028:47-51 tableRows() … docs/harness-engineering 直下のみ
                    └─→ 06-sensors.md / .ja.md（14 行、同期済み）
        ✗ docs/reference/07-sensor-system.md（9 行、無検査 → drift）
```

テキストフォールバック: **A** は配布集合の定義が 3 箇所（package 集合 / self-install 集合 / dist→ツリー写像 / 生成ルート allowlist）に分散し、どれもが他から導出されていない。唯一のガード（t531）は「self-install に載っているものは package にもある」方向しか見ないため、package 側にしか居ない pi は検査を通過する。doctor の鮮度検査も self-install 集合から引くので同じ盲点を持つ。**B** は CI から入る通常経路が events 台帳の存在によって `assertStrictAncestorOfHead` 側へ分岐するため、`validateBootstrapHistory` とその配下の到達性検査には到達しない。`postRevision` は到達性を一切見られず、文字列等値だけで通る。`baselineAtRevision` は存在しないファイルを参照するので必ず throw し、その throw を negative test だけが保持している。**C** はセンサーの実在コーパスが core ディレクトリと plugin 宣言から機械導出できるにもかかわらず、2 つの docs が同じ表を手書きしており、検査（t3028）は `docs/harness-engineering` 側だけを読む。`docs/reference/07-sensor-system.md` は誰からも参照されず drift する。

**3 領域の間に依存エッジは無い**（ファイル交差ゼロ）。機序は `architecture.md`、配置は `code-structure.md`、コンポーネント境界は `component-inventory.md` の各対応節を参照。

## 区間の依存エッジ変化と、優先バグ 5 件の依存方向（260816-priority-bug-batch-3、履歴、observed `89053172e`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260817-inception-cost-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する。現況は本ファイル末尾の 260817-inception-cost-batch 節を参照））

**外部依存の変化なし**（`git diff --stat 5c5911ee3 89053172e -- package.json bun.lock '**/package.json'` の**出力は空**、exit 0。本節の実測）。

**内部エッジの変化も 1 件のみ。** 本区間は新規モジュールがゼロなので、前区間のような依存グラフの拡張は起きていない。追加されたのは `amadeus-state.ts` → `amadeus-intent-autonomy.ts` の**既存エッジへの named import 追加** 1 行（`git diff -U0` の追加行 逐語 `import { autonomyDigest, declaredFullAutonomy } from "./amadeus-intent-autonomy.ts";`）である。`autonomyDigest` は元から import されていたので、**モジュール間のエッジ本数は不変**である。

### 本 intent の 5 領域の依存方向

```
A. #3153 / #3152 — 共有された呼び出し鎖（宣言が承認へ流れない / 監査へ流れすぎる）
   amadeus-orchestrate.ts:2822  routeMainWorkflowDirective（next ごと）
        └─┐
   amadeus-state.ts:3744        assertHumanPresentForGateResolution（approve 試行ごと）
        └─┴─→ amadeus-intent-autonomy-production.ts:295  productionStageAutonomy
                    ├─→ :314 → :354  emitAuthorizationRefusal   ← #3152（冪等鍵なし、毎回 append）
                    │        └─→ audit shard（INTENT_AUTONOMY_HUMAN_REQUIRED）
                    └─→ 戻り値 authorizationReason
                             ✗ amadeus-state.ts:3755-3756 で捨てられる  ← #3153（結線されていない）
   amadeus-state.ts:3761 → amadeus-lib.ts:3926  humanActedSinceGate  ← 承認可否を単独で決める
        └─→ scanPresenceLedger / resolveGatePresence（問いの同一性は見ない）

B. #3149 — CLI と sensor が同じ record を独立に読む（両立不能な契約）
   pr-convergence-cli.ts:610-617  transitionAllowed（converged = final）
        ├─→ :920-924  遷移拒否
        └─→ :763 → pr-convergence-git-runner.ts:213-243  verifyMergedEpochAncestry（:236 拒否文言）
   record/…/pr-convergence-report.md
        └─→ amadeus-sensor-pr-convergence-report-format.ts:297-298  kind による binding 分岐
                 ├─ landed     → checkMergeBinding
                 └─ non-landed → checkCheckoutBinding :331-334（live head 一致を要求）← 恒久 FAIL
        └─→ sensors/amadeus-pr-convergence-report-format.md（blocking / code-generation を止める）

C. #3156 — 3 プローブが単一起点へ収束する（冗長でない冗長化）
   amadeus-state.ts:2498  intentBirthCommit  ← 単一起点
        ├─→ :2511 (a) recordBranchSourceWork   birth..HEAD
        ├─→ :2525 intentBoltSlugs → :2542 boltRefsForSlug → :2556 (b) boltRefHasSourceWork
        └─→ :2568 intentIssueRefs → :2595 (c) mergedPrSourceWork   birth..HEAD
                 └─→ :2622 intentScopedSourceWork（短絡合成）
                         └─→ :2650 gitHasSourceWork（export、テストシーム）
                                 └─→ :2685 workspaceHasWork → :2726 evaluateStageArtifacts
   tests/unit/t206-source-work-intent-span.test.ts:33
        └─→ dist/claude/.claude/tools/amadeus-state.ts   ← 検証は build 済み dist に依存

D. #3046 — 読取スコープと書込スコープの非対称
   amadeus-election.ts:318（本番の唯一の呼出元）
        └─→ amadeus-election-store.ts:1032  appendPending
                 ├─→ :1042 readAllPending（:527-549、全 voter を読む）  ← 窓の始点
                 │        └─→ :545-547 横断の一意性検査（fail-closed、恒久 corrupt）
                 ├─→ :1063 max+1 で採番
                 └─→ :1088 writeStoreFile(pendingPath(dir, voter))     ← 窓の終点、voter 単位
                          └─→ tmp+rename（単一ファイル内の torn write のみ防ぐ）
   :990 / :1106 / :1221 も readAllPending に依存（tally / integrate 系）
```

テキストフォールバック: **A** では 2 つの入口（`next` directive の発行点と approve 試行）が同一の `productionStageAutonomy` へ収束する。その戻り値のうち副作用（監査行の発行）だけが下流へ届き、値（`authorizationReason`）は呼出側で捨てられる。承認可否は別系統の `humanActedSinceGate` が単独で決める。**B** では CLI と sensor が同じ record ファイルを独立に読み、CLI は「`converged` から先へ進めない」、sensor は「`landed` でない kind は live head と一致していなければならない」と主張する。両者に共通の上位機構が無いため、record が `converged` になった時点で両方向が塞がる。**C** では 3 つのプローブが分離された関数として書かれているが、判定範囲の起点をすべて `intentBirthCommit` から得るため独立していない。加えて検証経路が `dist/` を経由するので、修正の確認には build が要る。**D** では読みが全 voter スコープ、書きが 1 voter スコープであり、その間に他プロセスが同じ読みを行うと採番が衝突する。防御機構（tmp+rename）のスコープは単一ファイル内なので作用せず、検出機構（一意性検査）は永続化後にしか働かないため恒久 corrupt になる。

### 領域間の依存

**A（#3153 / #3152）は 1 つの鎖を共有する**ため独立に修正できない — 別 unit にすると `amadeus-state.ts` と `amadeus-intent-autonomy-production.ts` の 2 ファイルで write scope が衝突する。**C（#3156）は A と同一ファイル `amadeus-state.ts` を触る**が行域は非重複（`:2491-2691` vs `:3721-3772`）で、依存エッジとしての交差はない。**B（#3149）と D（#3046）は他のどの領域とも交差しない**（ファイル交差ゼロ）。

台帳同期の観点（`cid:build-and-test:bt-ledger-resync`）: **#3152 の方式が `amadeus-orchestrate.ts:2822` を変える場合のみ**、`amadeus/spaces/default/specs/tla/model-map.json` の impl ハッシュピンと `tests/.coverage-patch-allowlist.json` の意味的セレクタが発火する。他 4 件は現時点で該当しない。

機序は `architecture.md`、配置は `code-structure.md`、コンポーネント境界は `component-inventory.md` の各対応節を参照。

## 区間の依存エッジ変化と、focus 2 件の依存方向（260817-inception-cost-batch、履歴、observed `23d4ae767`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260818-priority-bug-batch-4 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**外部依存の変化なし**（`git diff --stat 89053172e..23d4ae767 -- package.json bun.lock '**/package.json'` の**出力は空**、exit 0。本節の実測）。ランタイム・開発依存・CI 構成（`.github/` も空 diff・exit 0）はいずれも不変である。

**内部エッジの変化も 1 件のみで、エッジ本数は不変。** 区間の全ソース diff から import 行の増減を抽出した述語（本節の実測）:

```bash
git diff -U0 89053172e..23d4ae767 -- 'packages/framework/core/tools/*.ts' 'plugins/**/*.ts' \
  | grep -E '^[+-]import '
```

→ 出力は **2 行（1 対の置換）のみ**:

```
-import { autonomyDigest, declaredFullAutonomy } from "./amadeus-intent-autonomy.ts";
+import { autonomyDigest, declaredFullAutonomy, isMilestoneInteraction } from "./amadeus-intent-autonomy.ts";
```

`packages/framework/core/tools/amadeus-state.ts:142` の 1 行で、**既存エッジ（`amadeus-state.ts` → `amadeus-intent-autonomy.ts`）への named import 追加**である。同エッジは前区間でも `declaredFullAutonomy` の追加で同じ形の変化をしており、**2 区間連続でモジュール間のエッジ本数が動いていない**。

なお `amadeus-state.ts` が `amadeus-lib` から取り込む名前は 2 件増えているが（`:42` `resolveGateResolutionPresence` / `:43` `type GateApprovalProvenance`。区間 diff の `@@ -39,6 +39,8 @@ import {` hunk）、これは**複数行 import の内部への追加**であり上の述語には現れない。エッジ自体は既存である — 当該ブロックは `:113` の逐語 `} from "./amadeus-lib.js";` で閉じ、`KNOWN_CODEKB_STAGES`（`:46`）など多数の名前を既に取り込んでいる。**単一行 import だけを見る述語には多行 import の内部追加が現れない**点は、依存棚卸しの述語設計上の注意として記録する（`cid:application-design:dual-key-consumer-inventory` の同族）。

### 区間で変化した依存の向き（是正後）

```
A. #3153 / #3152 — 宣言が承認へ結線され、拒否の発行点が gate 提示側へ移った
   amadeus-state.ts:3866   assertHumanPresentForGateResolution
        ├─→ amadeus-intent-autonomy.ts:762      isMilestoneInteraction   ← 新エッジ（既存 import 内）
        ├─→ (autonomy.humanRequired × interactionKind) → :3896-3897 milestoneStage
        └─→ amadeus-lib.ts:3967  resolveGateResolutionPresence(pd, verb, milestoneStage, ...)
                 └─→ GateResolutionPresence（判別ユニオン）→ provenance を承認記録へ

   amadeus-lib.ts:4038  humanActedSinceGate（verb 分岐）
        └─→ 同 :3967 へ milestoneStage=null で委譲   ← 狭めた述語と元の述語が同一関数

   STAGE_AWAITING_APPROVAL 発行サイト（初回 open / 改訂後の再提示 / reject の backfill）
        └─→ amadeus-state.ts:3811  recordGateOpenRefusal          ← 新設
                 └─→ amadeus-intent-autonomy-production.ts:432  recordAutonomyRefusalAtGateOpen
                          ├─→ :442-446  冪等鍵（occurrence, mode, presentationEpoch）
                          ├─→ :408-411  refusalAlreadyRecorded（既存行なら return）
                          └─→ audit shard（INTENT_AUTONOMY_HUMAN_REQUIRED、fail-open）
```

**前区間との差**: 前節が「`productionStageAutonomy` を読むたびに監査へ流れる」と記した向きは切断され、監査への矢印は**gate 提示サイトからのみ**出るようになった。読み取り（`next` ごと、承認試行ごと）は監査へ何も書かない。

```
B. #3149 — 束縛判定が kind ではなく receipt から出るようになった
   amadeus-sensor-pr-convergence-report-format.ts:322  checkAttestationEnvironment
        └─→ :303  touchesMergeFacts(body, receipt)
                 ├─ true  → :344  checkMergeBinding      （merge 事実を検査、local HEAD は見ない）
                 └─ false → :372  checkCheckoutBinding   （git rev-parse HEAD と照合）

   pr-convergence-cli.ts:1110  finaliseMergedInPlace → :1126 finaliseUnitInPlace
        └─→ :1083  finalRecordOnDisk（converged / override を拾う）
        └─→ receipt のみ再 attest（payload バイトと verdict は不変）→ audit receipt を append

   ※ :639 transitionAllowed / :1040 selfReportLifecycle の遷移規則そのものは不変
```

```
C. #3046 — 読みのスコープが書きのスコープへ揃った
   amadeus-election-store.ts:1070  appendPending
        └─→ :504  readPendingVoter（自 voter のファイルのみ）   ← 旧: readAllPending 全体読み
                 └─→ :537  voter 内単調性検査（fail-closed）
        └─→ :1104  Math.max(...voterPending) + 1

   同 :558  readAllPending（tally / integrate 経路）
        ├─→ :582  複合鍵 (voter, arrivalSequence) の一意性検査   ← 旧: arrivalSequence 単独
        └─→ :550  comparePendingEvents で (arrivalSequence, voter) の全順序を読み時に付与
```

**依存方向の要点**: append 経路から `readAllPending` への矢印が消え、**書きと同じスコープのみを読む**形になった。全順序はディスク上のプロパティではなく読み時の計算になったので、順序の正しさは書き込み順への依存を失っている。

```
D. #3156 — 4 番目の probe が trunk fork point を新しい起点として持ち込んだ
   amadeus-state.ts:2703  intentScopedSourceWork
        ├─→ :2516  recordBranchSourceWork          （birth..HEAD）
        ├─→ :2561  boltRefHasSourceWork            （bolt ref、merge-base）
        ├─→ :2600  mergedPrSourceWork              （birth..HEAD、Issue 参照）
        └─→ :2660  branchSourceWorkSinceTrunkFork  ← 新設
                 ├─→ :2625  resolveTrunkRef（refs/heads/main → refs/remotes/origin/main、完全修飾）
                 └─→ birth は「範囲の妥当性検査」にのみ使う（起点には使わない）
```

**前区間との差**: 前節が「3 プローブが `intentBirthCommit` を共有する単一障害点」と記した集中は、**probe (d) が起点を trunk fork point へ移した**分だけ分散した。ただし `birth === null` なら (d) も false を返すため、依存が完全に切れたわけではない。

### 本 intent の focus 2 件の依存方向

```
E. #2415 — RE の入力面（現状、consume 依存はゼロ）
   reverse-engineering.md:20   consumes: []          ← RE はいかなる artifact にも依存しない
   reverse-engineering.md:104-112  スキャン対象の列挙  ← 入力面はここだけ
        └─→ :114  templates/re-artifacts.md（Developer scan テンプレート）
   reverse-engineering.md:81-95   Preflight            ← base の更新方針であって入力面ではない
   除外規則: 不在（git grep -iE "exclude|excluded|exclusion|workflow exhaust|process record" → exit 1）
```

**依存上の含意**: RE は上流 artifact に依存しないので、除外規則を入れても**上流方向の新しいエッジは生じない**。生じるのは「stage 契約 → Developer scan の実行入力」という**契約から実行への一方向の拘束**だけである。

```
F. #3181 — RA の consume 面と、Issue 取り込みが要求する新しい依存
   requirements-analysis.md:14-29  consumes（6 件、Issue 由来ゼロ、全件 required: false）
        └─→ :68-71  Step 2 で読む
                 ├─ :70  codekb（RE artifact）
                 └─ :71  <record>/audit/<host>-<clone>.jsonl   ← 唯一の issue 的入力（散文）

   artifact 種別を足す場合の依存制約:
   amadeus-orchestrate.ts:2411  resolveConsumePath
        └─→ amadeus-graph.ts:856  producersOf(name)[0]        ← パスは producing stage が決める
   amadeus-graph.ts:1192-1198   producer 不在の consume は hard error
        ⇒ Issue を取り込む stage が produces: に宣言する依存が必須

   GitHub 側（既存の一方向依存、read path は実装済み）:
   <新しい consumer> ─→ amadeus-github-gateway.ts:175  viewArgv
                     ─→ 同 :418  parseIssueObject → RemoteGitHubIssue
                     ─→ 同 :799  readiness（gh --version → gh auth status）
   既存 adapter 2 種: :944 createMirrorGitHubGatewayAdapter / :950 createFindingGitHubGatewayAdapter
   port 宣言: amadeus-finding-types.ts:19 / amadeus-mirror-types.ts:427
   呼出:     amadeus-finding.ts:94 / amadeus-mirror-executor.ts:754-793（readiness 失敗は fail-open の警告）
```

**依存上の含意**: Issue の読取に**新しい外部依存は生じない**（`gh` は既に optional dependency として扱われ、gateway が唯一のプロセス境界である）。生じうるのは「Issue 証跡を produce する stage → gateway」という内部エッジ 1 本と、「RA → その artifact」という consume エッジ 1 本である。**consume エッジだけを足すと graph の hard error になる**点が、依存グラフ上の最も強い制約である。

### 台帳同期の観点

`cid:build-and-test:bt-ledger-resync` の発火条件を focus 2 件へ当てると:

| 触る面 | 発火する台帳 |
|---|---|
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `amadeus/spaces/default/specs/tla/model-map.json` の impl ハッシュピン + `tests/.coverage-patch-allowlist.json` の意味的セレクタ |
| `packages/framework/core/tools/amadeus-state.ts` / `amadeus-election-store.ts` | 同 model-map（本区間で **3 ピン**が実際に更新された） |
| 新規テストファイルの追加 | `tests/.coverage-registry.json` の regen（`cid:build-and-test:c1`） |
| `packages/framework/core/amadeus-common/stages/**` の frontmatter のみ | 上記いずれも発火しない。代わりに runtime graph の再 compile と `/amadeus --doctor` の参照検査が門番になる |

機序は `architecture.md`、配置は `code-structure.md`、コンポーネント境界は `component-inventory.md` の各対応節を参照。

## 区間の依存エッジ変化と、focus 2 件の依存方向（260818-priority-bug-batch-4、履歴、observed `127be70c5`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**外部依存の変化なし**（`git diff --stat 23d4ae767..127be70c5 -- package.json bun.lock '**/package.json'` の**出力は空**、exit 0。本節の実測）。ランタイム・開発依存・CI 構成（`.github/` も空 diff・exit 0）はいずれも不変である。

### 1. 内部エッジは 3 本増えた — 2 区間連続の「エッジ本数不変」が終わった

区間の全ソース diff から単一行 import の増減を抽出した述語（本節の実測）:

```bash
git diff -U0 23d4ae767..127be70c5 -- 'packages/framework/core/tools/*.ts' 'plugins/**/*.ts' \
  | grep -E '^[+-]import '
```

→ 出力は **4 行（すべて `+`、`-` はゼロ）**。うち 3 行は複数行 import の開始行なので、実体は次の 4 ブロックである（`amadeus-utility.ts:182-194` の逐語）:

```
+import {
+  createEvidenceGitHubGatewayAdapter,
+  parseGitHubRepository,
+} from "./amadeus-github-gateway.ts";
+import type {
+  EvidenceGitHubGateway,
+  RemoteGitHubIssueComment,
+} from "./amadeus-github-gateway.ts";
+import type {
+  GitHubRepository,
+  RemoteGitHubIssue,
+} from "./amadeus-github-types.ts";
+import { createGitHubProcessRunner } from "./amadeus-process-runner.ts";
```

**3 本とも新規のモジュール間エッジである**（本節の実測）:

| 述語 | base `23d4ae767` | observed `127be70c5` |
|---|---|---|
| `git show <c>:packages/framework/core/tools/amadeus-utility.ts \| grep -n "amadeus-github-gateway\|amadeus-github-types\|amadeus-process-runner"` | **出力なし・exit 1** | **4 行**（`:185` / `:189` gateway、`:193` types、`:194` process-runner） |

すなわち `amadeus-utility.ts` は base 時点で GitHub 面へのエッジを **1 本も持っていなかった**。前区間・前々区間はいずれも「既存エッジへの named import 追加」でエッジ本数が動かなかったが、**本区間は 3 本の新設**である。

### 2. 新しい依存の向き

```
packages/framework/core/tools/amadeus-utility.ts
   （issue-evidence fetch verb — :6824 runIssueEvidenceFetch / dispatch :6981）
        ├─→ ./amadeus-github-gateway.ts   ← 新エッジ
        │      createEvidenceGitHubGatewayAdapter (:1089)  … 3 つ目の adapter
        │      parseGitHubRepository
        │      type EvidenceGitHubGateway (:1077) / RemoteGitHubIssueComment (:478)
        │
        ├─→ ./amadeus-github-types.ts     ← 新エッジ（型のみ）
        │      type GitHubRepository / RemoteGitHubIssue
        │
        ├─→ ./amadeus-process-runner.ts   ← 新エッジ
        │      createGitHubProcessRunner   … runner の合成点
        │
        └─→ ./amadeus-lib.ts              ← 既存エッジ（本区間で名前が増えた）
               issueEvidencePath (:5043) / relativeIssueEvidencePath (:5051)
```

テキストフォールバック: `amadeus-utility.ts` が GitHub gateway・GitHub types・process runner の 3 モジュールへ新規に依存し、gateway 側では 3 つ目の adapter（`createEvidenceGitHubGatewayAdapter`）を経由する。runner の合成は utility 側で行われ、gateway は runner を注入されて受け取る。

**方向は逆転していない。** `amadeus-github-gateway.ts` は `amadeus-utility.ts` を知らない（依存は一方向）。gateway 自身は「GitHub と話す唯一のプロセス境界」という既存の位置づけを保っており、**新しい消費者が 1 つ増えただけ**である。循環は生じていない。

**注入の形**: `createEvidenceGitHubGatewayAdapter(runner)` は `MirrorProcessRunner` を引数に取り、内部で `createCombinedGitHubGateway(runner)` へ委譲する（`:1092`）。utility 側が `createGitHubProcessRunner` を呼んで runner を作り、adapter へ渡す — **port / adapter の注入形が既存 2 種と同じ**である。

### 3. `RE_SCAN_EXCLUDED_PATHSPECS` の依存 — コードと散文の対

`packages/framework/core/tools/amadeus-lib.ts:1540` の定数は、実行時に他モジュールから import されているわけではない。**消費者はテストと散文である**（`git grep -n "RE_SCAN_EXCLUDED_PATHSPECS" 127be70c5 -- 'packages/**' 'plugins/**' 'tests/**'` の実測、hit の内訳）:

| 消費者 | 種別 |
|---|---|
| `tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts:24` `:96` `:159` | drift guard（散文との一致を固定） |
| `tests/integration/t2415-re-scan-exclusion.integration.test.ts:28` `:163` `:168` `:202` `:208` `:218` `:223` `:242` `:243` | 挙動テスト |
| `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md:136` | 散文からの参照（逐語 `RE_SCAN_EXCLUDED_PATHSPECS in tools/amadeus-lib.ts`） |
| `tests/.coverage-registry.json:3533` | 台帳登録（`"unitId": "function:RE_SCAN_EXCLUDED_PATHSPECS"`） |

**プロダクションコードからの import はゼロである。** この定数は「散文が正本の値をコード側で機械照合可能にするためのアンカー」であり、実行時の依存ではない — 依存棚卸しの観点では **テストのみが実行時消費者**という珍しい形として記録しておく。

### 4. focus 2 件の依存方向

**是正は本区間で着地していない**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**、`"2837"` は allowlist の sha256 内部文字列 2 hit のみ）。

#### 4.1 #2837 — engine → directive → conductor の一方向経路で値が落ちる

```
amadeus-orchestrate.ts:3906  firstUncoveredBatch → { units, batchNumber }
        │
        │  （batchNumber は :4026 の SwarmSelection.pick に保持されている）
        ▼
amadeus-orchestrate.ts:4294  emitConfiguredSwarm(projectDir, pick.units)
        │                     ← 第2引数は units のみ。batchNumber はここで落ちる
        ▼
amadeus-directive.ts:312-331  InvokeSwarmDirective（6 面）
        │  閉語彙 :555 INVOKE_SWARM_FIELDS
        ▼
harness conductor face（8 面）
        └─→ amadeus-swarm.ts prepare --batch <n>   ← 7 面が **人手での値の供給**を前提に書かれている
                 └─→ :638  idempotencyKey: unit-pool:<batch>:initial-enqueue（durable な pool 識別子）
```

テキストフォールバック: engine 内部には batch 番号があるが、directive の閉語彙にその面が無いため、conductor まで届かない。conductor は `prepare --batch <n>` を実行する必要があり、値の出所は engine ではなく人手または推測になる。その値はそのまま pool の idempotency key になる。

**依存上の含意**: この経路には**逆向きの読取経路が無い**。conductor が engine の保持値を後から引く手段（`amadeus-swarm.ts` の read verb など）が存在しないため（`:1419` の 14 verb に `context` / `status` 相当は不在）、是正は「directive の面を広げる」か「読取エッジを新設する」かのどちらかになる。前者は既存の一方向経路の中で閉じ、後者は新しい依存方向を導入する。

#### 4.2 #3106 — 同一データ源に対する 2 本の読取エッジが非対称

```
record/audit/*.jsonl（単一のデータ源）
     │
     ├─→ amadeus-orchestrate.ts:3934  cancelledConstructionUnits
     │        └─→ amadeus-construction-outcome-projection.ts（canonical projection）
     │                 → solo の cancelled terminal を **見る**
     │
     └─→ amadeus-orchestrate.ts:2513  readPerUnitConsumePopulation
              ├─→ pool event set（実在行のみ）
              └─→ :2499 readSettledUnitOutcomes（:2508 で "succeeded" のみ受理）
                       → solo の cancelled terminal を **見ない**

  発行 amadeus-orchestrate.ts:4686 settlePerUnitOutcomes
        └─→ :4706 が cancelledConstructionUnits の結果を使って発行を抑止
              （＝検出側の事実が、母集団側へ渡らないまま消える）

  下流 amadeus-per-unit-consume-fanout.ts:199 KNOWN_OUTCOMES（cancelled を受理）
```

テキストフォールバック: 検出側は canonical projection を経由するため solo の cancelled を見るが、母集団側は projection を経由せず pool 行と settle 行だけを読むため見ない。発行側は検出側の結果を使って settle 行の発行を止めるので、検出側が見た事実は母集団側へ届かない。下流の fanout は `cancelled` を正規値として受理できる。

**依存上の含意**: 是正方式 (b)（母集団側を canonical projection から読むよう広げる）は、`readPerUnitConsumePopulation` から `amadeus-construction-outcome-projection.ts` への**新しい読取エッジ**を作る。方式 (a)（settle 側に cancelled 語彙を足す）は既存のエッジ構成を変えず、`amadeus-orchestrate.ts` 内部の 2 定数を開くだけで済む。**エッジ構成の観点では (a) が最小変更**だが、読み口の分裂という根は残る。方式選定は未決である。

## 区間の依存エッジ変化と、focus 4 件の依存方向（260820-fmc-drift-batch、現在、observed `e86fbe125`）

**観測 ref**: base `c8c393bba` → observed `e86fbe125`（97 commits）。

### 1. 外部依存 — 1 件削除、追加ゼロ

| 依存 | 変化 | 根拠 |
|---|---|---|
| `release-it` ^20.2.1 | **削除** | `git diff c8c393bba..e86fbe125 -- package.json` の実測（逐語 `-    "release-it": "^20.2.1",`）。`packages/setup/.release-it.json` も同時に削除 |
| `bun.lock` | +1 −294 | 上記の推移的依存の除去 |
| `mise.toml` | −1 | #3299（codex ツールチェーンピンの撤去） |

残る devDependencies は **9 件**（`bun -e` による `package.json` 直読）: `@anthropic-ai/claude-agent-sdk` 0.3.158 / `@ast-grep/napi` 0.45.0 / `@biomejs/biome` 2.5.5 / `@opentelemetry/api` 1.9.1 / `@opentelemetry/api-logs` 0.221.0 / `@opentelemetry/context-async-hooks` 2.10.0 / `bun-types` ^1.3.13 / `fast-check` ^4.9.0 / `typescript` ^6.0.3。**`dependencies` フィールドは存在しない**（同直読で `undefined`）ため、配布フレームワークの runtime dependency はゼロのままである。

### 2. 内部依存エッジの新設・撤去

| エッジ | 変化 |
|---|---|
| `tests/run-tests.ts` → `tests/lib/silent-success.ts` | **新設**（`run-tests.ts:65` の import）。ランナーが判定ロジックを純関数モジュールへ委譲する形 |
| `plugins/formal-model-check/tools/advisory-model-check.ts` → `tests/lib/advisory-model-check.ts` | **移設**（R094、#3078）。plugin ツリーからテストツリーへの一方向の移動であり、plugin → tests の依存を作ったのではなく **plugin ツリーから非宣言ファイルを除いた** |
| `scripts/release-land.ts` → `scripts/release-land-domain.ts` | **新設**。副作用層 → 純ドメイン層の一方向。テスト（`tests/unit/t-release-land.test.ts`）はドメイン層のみを import する |
| `packages/setup` → `release-it` | **撤去** |

### 3. focus 4 件の依存方向

```
                       amadeus/spaces/default/specs/tla/model-map.json
                                  （宣言データ・単一の正本）
                                        │
        ┌───────────────┬───────────────┼────────────────┬─────────────────┐
        ▼               ▼               ▼                ▼                 ▼
  validator        loader          sensor glob      applicability     registration
  amadeus-formal-  tla-model-      sensors/          tla-applica-      tla-registra-
  verif-model-     loader-         amadeus-model-    bility.ts         tion.ts
  map.ts           internal.ts     completeness.md        │                 │
  :248-251         :291            :8                    │                 │
    #2929 ─────────── #2929 ────────── #2929             #3186           #2289
        │                                                  │                 │
        └───────── 同一概念の 3 述語（別名） ──────────────┘                 │
                                                           │                 │
                                        AUTHORING_ROUTES の 2 箇所複製 ──────┘
                                        (:302 / :87)

  tla-authoring.ts ── 本番経路 :830/:838 ──▶ registration      ← #2289
        └── advisory hold :574 / subjects declare :649 ────── ← #3187（退役）
                    │
                    └── plugin.json advisories[] ── stages/tla-authoring.md:53
                                                          └── #3186 の発火述語の置き場
```

テキストフォールバック: `model-map.json` を単一の正本として、validator（`amadeus-formal-verif-model-map.ts:248-251`）・ローダー（`tla-model-loader-internal.ts:291`）・sensor glob（`sensors/amadeus-model-completeness.md:8`）の 3 面が独立に読み、#2929 はこの 3 面すべてに跨る。`tla-applicability.ts` と `tla-registration.ts` は `AUTHORING_ROUTES` を 2 箇所に複製して持ち、前者が #3186、後者が #2289 の患部である。`tla-authoring.ts` は registration の本番経路（`:830` / `:838`）であると同時に、advisory hold（`:574`）と subjects declare（`:649`）という #3187 の退役対象を抱える。stage 契約 `stages/tla-authoring.md` は #3187 の削除面（`:53`）と #3186 の追加面（発火述語の置き場）が同居する。

**依存方向から読める実装上の制約**:

- **#2929 は下から上へ直せない。** 3 述語は `model-map.json` を読む側であり、正本のデータ形式を変えずに述語だけを揃える形になる。
- **#2289 と #3187 は `tla-authoring.ts` を共有する。** 前者は本番経路（`:830` / `:838`）、後者は advisory / subjects の dispatch（`:900-901`）と USAGE（`:77,80-81`）で、行域は離れているが同一ファイルである。
- **#3186 と #3187 は `stages/tla-authoring.md` を共有する。** 前者は `:51` 近傍への追加、後者は `:53` の削除で、**隣接行**である。同時実装は競合が確実に起きる。
- **engine（`packages/framework/core/`）への依存は焦点 4 件のいずれからも生じない。** #3187 の `advisoryHold` という同名シンボルが `amadeus-orchestrate.ts:5675 / 6606 / 6639` に存在するが、これは `advisoryReportHoldReason` を受けるローカル変数名であり、汎用 advisory 機構（`spec-change` も同経路）に属する。**依存ではなく名前の一致にすぎない。**
