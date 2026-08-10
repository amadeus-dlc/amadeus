# Developer Code Scan Results

## スキャン条件

- **対象リポジトリ**: `amadeus`（single-repo intent）
- **観測コミット**: `e756b786d944d3259e68b354415b182545af4586`
- **観測日**: 2026-08-10（Asia/Tokyo）
- **対象 Intent**: `260810-swarm-directive-fixes`、brownfield、`self-feature`、Depth `Standard`、Test Strategy `Comprehensive`
- **重点範囲**: [Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833) と [Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834) が共有する Construction directive 発行 seam
- **変更境界**: ソース、テスト、共有 codekb 9成果物は変更していない。本ファイルだけを生成した。
- **行番号の扱い**: Issue コメント中の旧 SHA の番号は引用せず、すべて current HEAD で `rg -n` により再解決した。

## Packages Found

- `amadeus-claude-code-dev`（root private workspace）— TypeScript/Bun — framework のビルド、配布投影、テスト、品質ゲートを統括する。
- `@amadeus-dlc/framework`（`packages/framework`）— TypeScript/Markdown — 共有 core、32 stage、tools、hooks、knowledge、各 harness 投影元を保持する。
- `@amadeus-dlc/setup@0.1.7`（`packages/setup`）— TypeScript/Bun CLI — `amadeus-setup` installer を生成する。
- `packages/framework/core/tools` — CLI/engine/service 層。今回の主要面は `amadeus-orchestrate.ts`、`amadeus-directive.ts`、`amadeus-bolt.ts`、`amadeus-swarm.ts`、`amadeus-state.ts`、`amadeus-reviewer-runtime.ts`、`amadeus-intent-autonomy*.ts`。
- `packages/framework/core/hooks` — hook adapter/core。今回の主要面は `amadeus-stop.ts`。
- `packages/framework/core/amadeus-common/stages` — 32 stage の宣言と本文。機械抽出で `for_each: unit-of-work` は5 stage、該当 required consume を持つ非 per-unit consumer は7 stage。
- `scripts` — packaging、promotion、distribution/source-only 検査。
- `tests` — 14直下ディレクトリ、tracked test file 1,074件。unit/integration/e2e/smoke/PBT/perf/formal-verif を含む。
- 規模観測: tracked 16,385 files、TypeScript 1,641 files、Markdown 9,692 files。対象 source set（core/setup/scripts/plugins）は TypeScript 368 files。

## Build System

- **Type**: Bun workspace（Bun `1.3.13` 実測）、TypeScript ESM。
- **Config Files**: `package.json`、`bun.lock`、`tsconfig.json`、`tsconfig.tests.json`、`biome.json`。
- **Build**: `bun run build` = `dist` (`scripts/package.ts`) + `promote:self`。source-only repository では `dist/` は disposable generated output であり、正本は `packages/framework/core` と harness source。
- **Build Dependencies**: root → `packages/framework` / `packages/setup`; framework core → harness packaging script → generated `dist/<harness>`; tests → `dist/claude/.claude` fixture surface。今回の CLI 再現は current source から既に生成済みの local `dist/claude` を使用した。
- **Quality scripts**: `typecheck`、Biome `lint`、`distribution:check`、`source-only:check`、`test:ci`、`coverage:ci`、`no-silent-drop`。

## APIs Discovered

- **CLI API** — `amadeus-orchestrate.ts` — `next`、`report`、`park` を含む directive read/write half。JSON directive が public contract。
- **CLI API** — `amadeus-swarm.ts` — `prepare/check/retry/finalize/resolve/initial-enqueue/acquire/confirm-dispatch/record-reconciliation/settle-release/...`。`finalize` は exit 0/2 と failure envelope を返す。
- **CLI API** — `amadeus-bolt.ts` — `fail`、`abort`、batch approval、worktree merge lifecycle。
- **CLI API** — `amadeus-state.ts` — stage/state transition と `park`。stage 単位の `skip` はあるが、Unit 単位 Skip の状態表現はない。
- **Internal API** — `RunStageDirective` / `InvokeSwarmDirective` — `consumes`、`consumes_absent`、`produces`、`unit`、`gate` 等。
- **Internal API** — reviewer runtime — directive を検証し、stage file + existing produces + on-disk consumes に read scope を閉じる。
- **Internal API** — Intent autonomy aggregate/runtime — `workflowExecutionState`、`parkEnvelope`、`StopReason` を持つ durable projection。
- HTTP server、DB、長時間サービスはない。短命 CLI と filesystem/audit journal が境界である。

## Frameworks & Libraries

- Bun `1.3.13` — runtime、test runner、bundler。
- TypeScript `^6.0.3` / `bun-types ^1.3.13` — type system。
- Biome `2.5.5` — formatter/linter。
- `fast-check ^4.9.0` — property-based testing。
- `@ast-grep/napi 0.45.0` — structural scan。
- OpenTelemetry API `1.9.1`、logs `0.221.0`、context async hooks `2.10.0` — observability。
- `@anthropic-ai/claude-agent-sdk 0.3.158` — Claude harness integration。
- `release-it ^20.2.1` — release automation。

## Test Coverage

- **Test Directories**: `tests/{unit,integration,e2e,smoke,conformance,formal-verif,hooks,no-silent-drop,perf,manual,harness,helpers,fixtures,lib}`。
- **Test Frameworks**: Bun test、fast-check、shell/CLI fixture harness、live harness adapters。
- **Coverage Config**: `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`。coverage mechanism ratchet と registry が存在する。
- **current HEAD 実測**:
  - `t116` + `t186` + `t211` + `t115`: **66 pass / 0 fail / 211 expect**。
  - `t122` + `t432`: **29 pass / 0 fail / 94 expect**。
  - swarm/halt group (`t134`,`t135`,`t379`,`t09`,`t10`,`t11`,`t76`): **71 pass / 0 fail / 273 expect**。
  - `t121` と `t431` は個別 case の pass 出力を観測したが、最初の合成実行の最終 summary は出力上限で保存できなかった。上記3つの確定 summary と重複しない追加全体値には算入しない。
- **未実施**: `bun run test:ci` 全体、全 lint/typecheck、coverage 全体。RE の重点 seam の read-only scan を優先したためで、Construction の収束判定では必須。

## Code Quality Indicators

- **Linting**: Biome (`biome.json`、`bun run lint`)。root script は cognitive complexity warning を許容する既知 baseline。
- **CI/CD**: `.github/workflows` 9 files（`ci.yml`、`pbt.yml`、`perf.yml`、`release.yml`、metrics/no-silent-drop 系を含む）。
- **Documentation**: root `README.md`、`docs/guide`、`docs/reference`、harness engineering docs、stage/protocol/knowledge が厚い。今回の seam は code comment と protocol が豊富だが、実装と契約の非対称が残る。
- **Quick assessment**: naming=good、test presence=good、error handling=fair、function/file size=fair、duplication=fair、dead code=未確定。
- **Measured debt indicators**: source set の `TODO|FIXME|HACK` は0件。一方、500行超 TypeScript は84 files あり、巨大 CLI module（特に orchestrate/state/swam）では変更影響の閉包が広い。

## Issue #2834: producer-owned consume path seam

### Call graph

```text
stage frontmatter consumes[]
  -> buildRunStageDirective
     -> resolveConsumes
        -> resolveConsumePath                         orchestrate.ts:2376
           -> producersOf(artifact)[0]
           -> resolveArtifactPath(owner=producer)    orchestrate.ts:2343
              -> isPerUnit(owner)
              -> construction/${unit}/${owner.slug}
     unit default = "{unit-name}"                    orchestrate.ts:2288,3880
     -> splitConsumesByPresence                       orchestrate.ts:2473
        -> placeholderなら present(consumes)へ        orchestrate.ts:2490-2493
  -> non-per-unit emitForSlug                         orchestrate.ts:4271
     -> emitRunStageForSlug(unit未指定)
  -> RunStageDirective.consumes
     -> reviewer scopeForDirective
        -> onDisk filter により存在しない consume を無音除外
```

### current HEAD の契約と症状

- `resolveConsumePath` は consumer ではなく producer を owner とする（`amadeus-orchestrate.ts:2376-2385`）。これは artifact の配置責任として正しい。
- `resolveArtifactPath` は owner が per-unit なら `construction/${unit}/${owner.slug}/${name}.md` を作る（`:2343-2368`）。
- 非 per-unit consumer は `emitForSlug` から concrete unit を渡さず、`emitRunStageForSlug` の既定 `UNIT_NAME_PLACEHOLDER` が残る（`:2288`, `:3880-3913`, `:4271-4292`）。producer stage の per-unit 分岐自体は `emitPerUnitRunStage`（`:4138-4264`）で concrete unit を解決するが、consumer fan-in には対応する分岐がない。
- `splitConsumesByPresence` は placeholder path を existence-unknown として `consumes` 側へ残す（`:2473-2504`）。wire contract も `consumes_absent` から placeholder を除外すると明記する（`amadeus-directive.ts:138-150`）。
- current HEAD の実再現では、実 Unit `real-unit` に plan/summary を置いても `build-and-test` directive は2本とも `{unit-name}` のまま、`consumes_absent=null`、CLI exit 0 だった。

### 7 consumer stage の機械抽出

32 stage frontmatter から `for_each: unit-of-work` producer の `produces` 集合を作り、非 per-unit stage の `required:true` consume と join した。結果は **7 consumer / 19 required consume edge** である。

| Consumer | 件数 | per-unit producer | Artifact |
|---|---:|---|---|
| `build-and-test` | 2 | `code-generation` | `code-generation-plan`, `code-summary` |
| `ci-pipeline` | 1 | `code-generation` | `code-summary` |
| `performance-validation` | 4 | `nfr-requirements`, `nfr-design` | performance/scalability requirements/design |
| `observability-setup` | 5 | `nfr-design`, `infrastructure-design` | performance/security/reliability/monitoring design, infrastructure services |
| `incident-response` | 3 | `nfr-design`, `infrastructure-design` | reliability/security design, deployment architecture |
| `deployment-pipeline` | 2 | `infrastructure-design` | deployment architecture, CI/CD pipeline |
| `environment-provisioning` | 2 | `infrastructure-design` | deployment architecture, infrastructure services |

### `consumes_absent`、t116、reviewer、sensor

- `t116` test 14/15 は通常 path の「present optional / absent required / absent optional」を固定し、test 16 は **`{unit-name}` placeholder consume は split 免除で `consumes` に残る**ことを明示的に pin する（`tests/unit/t116-directive-path-resolution.test.ts:500-570`）。
- ただし test 16 の vehicle は `--single nfr-requirements` であり、`build-and-test` fan-in を直接 pin しない。consumer fan-out/fail-closed を実装する場合、placeholder 免除そのものを変えなければ pin と両立し得る。
- reviewer runtime は `directive.consumes.filter(onDisk)` を行う（`amadeus-reviewer-runtime.ts:357-378`）。placeholder は実在しないので reviewer read scope から無音で脱落する。現行7 consumer は reviewer 宣言を持たないが、将来の reviewer 追加と shared runtime contract に対する潜在的な silent gap である。
- upstream-coverage は resolved path ではなく CLI に渡された consume slug の文字列を成果物本文に照合する（`amadeus-sensor-upstream-coverage.ts:65-103`）。したがって今回の path defect には非影響で、検出もしなければ壊れもしない。
- `t186` の skeleton-unresolved round-trip は producer 側 placeholder の正当な一時発行（`:4138-4157` 相当）を pin するため、consumer fan-in 修正で保存すべき別契約である。

## Issue #2833: failure directive と parked termination seam

### Call graph

```text
swarm fixed pool terminal
  -> amadeus-swarm finalize
     -> SWARM_UNIT_FAILED
     -> BOLT_FAILED
     -> SWARM_BATON_RETURNED                         swarm.ts:1067
     -> failure envelope + exit 2
  -> conductor halt-and-ask (Retry / Skip / Abort)
     Retry -> 同一 unit/worktree を再試行
     Skip  -> Unit単位 state representation/read pathなし
     Abort -> amadeus-bolt abort
              -> BOLT_FAILED Reason=aborted         bolt.ts:625-684
              -> state/cursor writeなし
  -> amadeus-orchestrate next
     -> tryEmitSwarm                                 orchestrate.ts:3788
        -> selectSwarmBatch                          :3726
           -> firstUncoveredBatch                    :3625
              -> unitCovered (producesのexistsSync)  :4013
     -> 同じ invoke-swarm を再発行
  -> Stop hook -> next kind を読む
     parked/done/ask/select-intent はallow
     invoke-swarm はcapまでblock
```

### Symbol / reader-writer inventory

| Symbol/state | Writer | Reader / decision use | 観測 |
|---|---|---|---|
| `report --result` | conductor → engine | `FORWARD_RESULTS` | `approved/completed/complete/done` の4値だけ（`orchestrate.ts:4635`, main guard `:5557-5564`） |
| `BOLT_FAILED` | bolt fail/abort、swarm failure | audit/schema/reporting | `orchestrate.ts` / `amadeus-state.ts` / `amadeus-stop.ts` の decision reader は **0件** |
| `SWARM_BATON_RETURNED` | `emitBatonReturned` (`swarm.ts:428-437`, call `:1067`) | audit/schema/tests | 同3面の decision reader は **0件** |
| Unit coverage | per-unit produces files | `unitCovered` | failure ledger ではなく required produces の `existsSync` のみ |
| state `Parked` | `amadeus-state park` (`state.ts:1385-1416`) | `next` parked emit (`orchestrate.ts:3104-3114`) | autonomous Construction では writer が先に拒否 |
| `parked` directive | state marker route / `handlePark` | Stop hook | Stop は `kind === "parked"` を即 allow（`amadeus-stop.ts:931-949`） |
| autonomy `workflowExecutionState` / `parkEnvelope` | autonomy runtime `commitPark` | autonomy runtime/status/review | `amadeus-orchestrate.ts` と `amadeus-stop.ts` には両 symbol が **0件**。state `Parked` と未配線 |

### current HEAD 実測

- `bun dist/claude/.claude/tools/amadeus-orchestrate.ts report --stage code-generation --result failed` は **exit 0** で `{"kind":"error",...}`。message は accepted outcomes 4値を返す。非ゼロ終了ではない。
- `handleAbort` は optional discard 後に `BOLT_FAILED Reason=aborted` を emit し JSON を返すが、state write API を呼ばない（`amadeus-bolt.ts:625-684`）。worktree preserve/discard/retry correlation は `t09/t10/t11` が green。
- `finalize` は terminal pool を再検証し、失敗 unit ごとに `SWARM_UNIT_FAILED`、`BOLT_FAILED`、`SWARM_BATON_RETURNED` を emit、exit 2 とする（`amadeus-swarm.ts:883-1084`）。`t134/t135/t379` が green。
- `tryEmitSwarm` の選択入力は graph stage、skeleton、DAG、autonomy、batch approval、artifact coverage であり、failure/abort audit は含まない（`:3726-3830`）。したがって abort 前後で成果物が増えなければ同一 batch/unit を再提示する。
- generic `park` は state tool が `Construction Autonomy Mode: autonomous` を拒否する（`amadeus-state.ts:1385-1395`）。一方 Stop hook は engine が `parked` を返せば full autonomy でも終端として許可する。欠けているのは Stop 側ではなく、failure/abort を durable parked/terminal directive へ配線する write/read edge である。
- Stop continuation cap は full/semi で8、interactiveで2（`amadeus-stop.ts:145-159`）。`t121` は autonomous default が8 blocks後の cap+1 release、`parked` はbudget消費なしで即 allowを pin する。
- Retry/Skip/Abort の protocol は `stage-protocol.md:143-147,161-166`。現状 engine-owned に表現できるのは Retry と偶然同型の再提示だけ。stage 単位 `skip code-generation` は未実装 Unitを残して先へ進むため、Unit Skip/Construction Abort の意味を満たさない。
- swarm だけに限定されない。非-swarm per-unit `run-stage` も `BOLT_FAILED` reader 不在は同じで、再提示 kind だけが異なる。

## Related Tests Inventory

| Seam | Tests | 現在 pin していること / 欠落 |
|---|---|---|
| consume path / absent | `t116-directive-path-resolution` | producer-keyed path、presence split、placeholder免除。7 consumer fan-in は未pin |
| per-unit producer routing | `t186-foreach-per-unit-iteration` | concrete unit、gate抑制、degrade fail-closed、skeleton unresolved |
| batch selection | `t211-swarm-batch-progress` | artifact coverage による first uncovered batch、gated/full |
| report result | `t115` | unknown result を error directive にする。`failed` transition は未実装 |
| Stop termination | `t121`, `t122` | parked/done allow、pending block、cap、generic autonomous park拒否と安全な parked directive |
| swarm failure audit | `t134`, `t135`, `t379` | exit 2、failure envelope、baton emit、event registry mapping |
| halt-and-ask worktree | `t09`, `t10`, `t11`, `t76` | preserve/discard/retry correlation と Retry/Skip/Abort prose |
| autonomy projection | `t431`, `t432` | suspended/park envelope のaggregate/runtime内部契約 |
| **欠落する回帰試験** | なし | `Abort/Skip -> nextが同じunitを再発行しない`、success扱いしない、Stopが1回でallow、swarm/non-swarm対称、7 consumerのfan-in |

## Technical Debt Signals

- **契約の二重系統**: state Markdown の `Parked` と autonomy projection の `workflowExecutionState/parkEnvelope` が別々に存在し、engine/Stop は前者だけを見る。
- **write-only failure facts**: `BOLT_FAILED` と `SWARM_BATON_RETURNED` は監査・telemetry には届くが、directive selector の判断入力ではない。
- **placeholder fail-open**: producer 側 degrade は解決不能 placeholder を fail-closed にする一方、非 per-unit consumer 側は present 扱いで emit する。
- **巨大 module**: `amadeus-orchestrate.ts` が path resolution、batch selection、directive validation、report transition、parking を一つに持ち、局所修正でも対称経路の見落としリスクが高い。
- **仕様/本文 drift**: `build-and-test` 本文は code summary の glob 読みを案内するが、frontmatter の plan+summary required contract と directive は placeholder のまま。
- **テスト gap**: 個々の emitter、projection、Stop終端は強く pin される一方、failure fact から次 directive までの end-to-end transition がない。

## 再現可能な観測コマンド

```bash
git rev-parse HEAD
mise trust

# current line map / reader absence
rg -n 'UNIT_NAME_PLACEHOLDER|resolveConsumePath|splitConsumesByPresence|emitPerUnitRunStage|tryEmitSwarm|unitCovered|FORWARD_RESULTS|parkedDirective' packages/framework/core/tools/amadeus-orchestrate.ts
rg -n 'BOLT_FAILED|SWARM_BATON_RETURNED|workflowExecutionState|parkEnvelope' packages/framework/core/tools/amadeus-orchestrate.ts packages/framework/core/tools/amadeus-state.ts packages/framework/core/hooks/amadeus-stop.ts

# report failed の wire contract（exit codeも確認）
bun dist/claude/.claude/tools/amadeus-orchestrate.ts report --stage code-generation --result failed

# target tests
bun test --timeout 120000 tests/unit/t116-directive-path-resolution.test.ts tests/unit/t186-foreach-per-unit-iteration.test.ts tests/unit/t211-swarm-batch-progress.test.ts tests/unit/t115.test.ts
bun test --timeout 120000 tests/e2e/t122-stop-hook-e2e.test.ts tests/integration/t432-intent-autonomy-runtime.integration.test.ts
bun test --timeout 120000 tests/e2e/t134-swarm-referee.test.ts tests/integration/t135-invoke-swarm.test.ts tests/integration/t379-swarm-canonical-emit.test.ts tests/e2e/t09-halt-and-ask-preservation.test.ts tests/e2e/t10-halt-and-ask-discard.test.ts tests/e2e/t11-halt-and-ask-retry-correlation.test.ts tests/integration/t76-halt-and-ask-prose-shape.test.ts
```

7 consumer の抽出は、全 stage frontmatter を読み、`produces` の owner map を作り、`!consumer.for_each && consume.required && owner.for_each` を filter した Bun one-linerで実施した。観測結果は consumer 7、edge 19、per-unit producer 5、stage 32。

## 未確定事項

1. #2834 の正規契約を「全 Unit path へ fan-out」「代表 Unit」「fail-closed」のどれにするか。受入条件と reviewer read scope を考えると全 Unit fan-out が自然だが、directive cardinality と optional/expected semantics の要件裁定が必要。
2. placeholder 免除を一般に廃止するか、consumer fan-in だけで concrete path を作り免除契約を保存するか。`t116` test 16 と skeleton unresolved を不用意に壊してはならない。
3. #2833 の durable source of truth を state `Parked` に寄せるか、既存 autonomy `parkEnvelope` を engine/Stop に接続するか、failure専用 terminal directiveを追加するか。
4. Retry/Skip/Abort の相関キーを batch+unit+plan generation のどこまで含めるか。古い `BOLT_FAILED` を別実行へ誤適用しない reader 設計が必要。
5. Skip は「Unitをcovered相当にする」のか「batchから除外し証拠を保持する」のか。成果物実在だけを coverage とする現行 invariant との整合が必要。
6. non-swarm failure と swarm baton return を同一 transition API へ統合するか。swarm限定修正では同根の solo経路が残る。
7. current HEAD 全体の lint/typecheck/test:ci/coverage は未実施。Construction で変更後に、上記欠落回帰試験を先に赤くしてから全品質ゲートを実測する。

## 結論

#2833/#2834 は、いずれも「producer/referee が正しい一次事実を作るが、次 directive を決める selector への read edge が欠ける」共有 seam の欠陥である。#2834 は Unit identity が producer-owned path resolver へ届かず placeholder が fail-open し、#2833 は failure/abort identity が batch selector/parked termination へ届かず同じ work を再提示する。修正範囲は `amadeus-orchestrate.ts` だけの局所条件追加では足りず、wire contract、reader/writer 相関、reviewer scope、Stop終端、swarm/non-swarm対称、既存 pin の保存を一つの設計として扱う必要がある。
