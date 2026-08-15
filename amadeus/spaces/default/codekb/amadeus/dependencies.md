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
