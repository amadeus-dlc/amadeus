# 依存関係

## Internal Dependency Graph

```text
amadeus/config.json
  -> amadeus-graph.ts
  -> compiled scope-grid.json / stage-graph.json
  -> amadeus-orchestrate.ts
  -> plugins/pr-convergence/stages/pr-convergence.md

plugins/pr-convergence/plugin.json
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

## Issue #2985 依存グラフ（現在、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`）

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
