# Reverse Engineering Re-scan: 260804-tla-authoring

上流成果物（consumes）: なし。入力は intent state、[Issue #2161](https://github.com/amadeus-dlc/amadeus/issues/2161)、承認済みScope Definition、Developer Code Scanの完全結果である。Project TypeはBrownfield、Scopeは`self-feature`、DepthはStandard、Test StrategyはComprehensive。

## 実行メタデータ

- Date: `2026-08-04T13:19:55Z`（rebase後freshness再接地）
- Repo: `amadeus`（単一repo）
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `7172aea8dacb2a187d71697cbc8561c1614e25a4`（= `origin/main` / worktree HEAD）
- Ancestry: `git merge-base --is-ancestor <base> <observed>` → exit 0
- Distance: `git rev-list --count <base>..<observed>` → 21 commits
- Diff: base→observedは828 files、+61,315 / -2,642。
- Rebase note: 旧observed `be6a8085b9b8ff7e3b384dcaf34653cae29f307f`は新observedのancestorではない（`git merge-base --is-ancestor` exit 1）。したがって旧→新は連続コミット差分と解釈せず、tree deltaとして6 commits / 73 files / +1,453 / -1,913を評価した。
- Focus: 要求/design identityからモデル適用判定、authoringまたは改訂、trace/staleness、proof/review、登録、既存executorへ到達する責務鎖の実在性と、M7/M8に必要なcomposed plugin実行可能性。

## Developer Code Scanの統合結果

### Repository / build断面

- rootはBun-only TypeScript monorepo。Bun 1.3.13、TypeScript `^6.0.3`、Biome 2.5.5、fast-check `^4.9.0`。
- `packages/framework/core/`: 32 stage、14 persona、105 tool、13 hook、8 sensorの正本。
- `packages/framework/harness/`: Claude / Codex / Cursor / Kimi / Kiro / Kiro IDE / OpenCode / Piの8 adapter。
- `plugins/formal-model-check/`: opt-in stage 1件、tool 27 files。`specs/tla/`はFormalElection / MirrorLifecycle、CFG、aux、falsification/vacuity variants、model-map v2を保持。
- `tests/`: unit 354 / integration 443 / e2e 97 / smoke 16 / perf 10 TypeScript files。
- HTTP service、database、long-running serverはない。外部runtimeはTLC artifact 1.7.4、TLC2 output 2.19、OpenJDK 26.0.1、digest-pinned Docker。

### 差分で増えた再利用可能基盤

- PR [#2176](https://github.com/amadeus-dlc/amadeus/pull/2176): FormalElection以外のverified-source receipt、selected model/config、registered identity、auxiliary transcriptへの束縛を追加。
- PR [#2178](https://github.com/amadeus-dlc/amadeus/pull/2178): local `--out`の未使用directory契約と`OUT_CONFLICT`を文書化。
- いずれもexecutor側の改善であり、要求/designからauthoringを起動するowner、trace/reduction/proof receiptを追加していない。

### Rebase後tree delta

- 主な変化はstructured config導入と関連docs/tests。`amadeus-orchestrate.ts`は`autoMirror`→`intentMirror.github.issue.mode`、`maxParallelUnits`→`swarm.unit.concurrency.limit`の設定参照変更であり、formal activation/advisoryの意味は不変。checkpoint集合は`:1378`、発行関数は`:1401`。
- `scripts/plugin-projection.ts`もstructured config参照変更のみ。`validatePluginSources:208-226`はmanifest掲載fileの存在・identity・path安全性を検査するが、TypeScript import closureを検査しない。
- `model-map.json`は既存2 rowのimplementation SHA pinだけを更新した。FormalElectionの`amadeus-election.ts`は`:32-33`=`d52010a0…`、MirrorLifecycleの`amadeus-mirror-coordinator.ts`は`:75-76`=`452a279d…`。schema、2 model構成、vocabulary、model/cfg/aux identity、requirement/design traceとproof/review receiptの有無は不変。

## Issue #2161に対する現行能力

### 再利用できるもの

1. model-map v2のmodel/cfg/aux/impl identity、named invariant、trace state variables。
2. source drift、implementation drift、`--impl-only`、atomic map refresh。
3. advisoryとTLC artifactのspec identity / advisory instance相関。
4. TLC completion、counterexample、artifact digest、environment receiptのfail-closed検証。
5. 複数モデルCIとselected-model receipt。
6. falling proof、vacuity、reductionの実践手順とMirrorLifecycle実例。

### 実行可能authoring ownerは0件

- core 32 + plugin 1の全33 stageで、`.tla` / `.cfg` / reduction / `model-map.json`の新規作成・改訂を完了条件まで所有するstageは0件。
- `plugins/formal-model-check/stages/formal-model-check.md:2-16`は`consumes: []`、`produces: []`、`requires_stage: []`、`scopes: []`で、登録済みモデル実行専用。
- `docs/reference/22-formal-model-supply.md:92-142`は供給手順を説明するが、actor / trigger / artifact / completionをstage graphへ配線しない。
- activation入力は`specs/tla/**`のみ（`amadeus-plugin-activation.ts:42`）。requirements/design identityを読まない。
- requirements-analysis / functional-design / build-and-testのadvisoryはspec hashを判定するだけで、要求内容の形式検証適用可否を判断しない。
- model-map vocabularyはrequirements / FR / cid / 裁定 / design identityを保持しない。
- `updateModelMap`は既存`map.models.map(...)`を再発行する更新器で、新規model row生成APIではない。
- implementation path parserとmodel-completeness sensor globは既存familyに閉じており、未知題材では複数箇所の手同期を要する。
- 現行human choiceは`run-now` / `defer-with-risk`であり、reduction / invariant / registrationの独立review承認ではない。

## Tracked BLOCKER候補: composed plugin import closure

同根のmanifest未登録sourceは全数2件。

| Source | Runtime importer | 状態 |
| --- | --- | --- |
| `plugins/formal-model-check/tools/tla-model-receipt.ts` | `run-model-check-source.ts:13-16`、`fs-tlc-toolchain.ts`、`tlc-toolchain.ts` | PR #2176で追加、`plugin.json:11-36`に未登録 |
| `plugins/formal-model-check/tools/tla-module-deps.ts` | `tla-model-loader-internal.ts:14-18` | canonical copy生成はあるが`plugin.json:11-36`に未登録 |

plugin compositionはmanifest由来のclosed `ownedPaths`だけをhostへ複製するため、両sourceは`.codex/plugins/formal-model-check/`へ到達しない。`tla-model-receipt.ts`だけを登録しても、次に`tla-module-deps.ts`で再び失敗する。

### 対照実測

| 実行 | 結果 |
| --- | --- |
| fresh canonical source direct focused formal suite | 44 pass / 0 fail / 168 expect、exit 0 |
| plugin projection/package tests（旧`be6a8085` scan、2 files） | 18 pass / 0 fail、exit 0 |
| `bun .codex/plugins/formal-model-check/tools/run-model-check.ts --help` | `Cannot find module './tla-model-receipt.ts'`、exit 1 |

projection testsはmanifest自体を正として投影を検査するため、manifestから漏れたimport closureを検出しない。canonical direct greenはcomposed runtimeの実行可能性を証明しない。

### Scopeとの関係と裁定先

これはM7（未知題材E2Eのexecutor handoff）とM8（既存2モデル・全harness互換）に直接抵触する既存基盤欠陥である。ただしReverse Engineeringが修復をscopeへ自動追加してはならない。Requirements Analysisへ次の閉じた選択として送る。

1. **推奨**: #2161のauthoring実装前提として、同Intent内で2件のmanifest/import-closureを同根修復する。
2. 別Issue化する場合は#2161へhard dependencyを張り、解消までM7/M8完了を許可しない。
3. 修復せず続行する案は、承認済みMust outcomesと矛盾するため不採用。

## Architecture synthesis

### 責務鎖

```text
要求 / design identity
  -> applicability
  -> author / revise / impl-only / non-target
  -> trace coverage + staleness
  -> TLC + falling + vacuity proof
  -> independent review + human gate
  -> atomic model registration
  -> existing formal-model-check executor
```

配置方式（新規stageか既存stage overlayか）、identity粒度、receipt schema、登録原子性は後続設計事項であり、本scanでは固定しない。既存executor、verdict normalization、FormalElection / MirrorLifecycle identityは保護境界とする。

### 配布鎖

```text
canonical plugin source
  -> plugin.json closed tools manifest
  -> dist neutral/per-harness bundle
  -> composition ownedPaths
  -> composed harness runtime
```

未登録2sourceは最初の矢印で落ちる。import-closure guardも現存しない。

## 品質評価

- rebase後fresh focused formal: 44 pass / 0 fail / 168 expect、exit 0。
- rebase後composed Codex: receipt module missing、exit 1。静的検査は`UNLISTED:tla-model-receipt.ts` / `UNLISTED:tla-module-deps.ts`。
- typecheck exit 0、lint exit 0（407 warnings / 10 infos）、graph compile exit 0、projection/package 18 passは旧observed `be6a8085`の初回scan結果であり、新observedでは再実行していない。
- coverage baseline: 7,225 / 17,648 lines（約40.94%）。baseline比 -0.02pp、patch zero-hit、class別ratchetあり。
- formal-model-check CIは`workflow_dispatch`限定で、required `CI Success`のneedsに含まれない。
- runtime/plugin/setup/scriptsのTODO/FIXME/HACK実質0件。
- god file: `amadeus-lib.ts` 8,778行、`amadeus-utility.ts` 6,281、`amadeus-orchestrate.ts` 5,623、`amadeus-state.ts` 5,597、formal `fs-tlc-toolchain.ts` 2,197、`tlc-toolchain.ts` 1,058。
- 文書と品質gateは厚いが、「文書化された手作業」と「stageが所有する実行工程」、および「canonical direct test」と「composed runtime」の間に断線がある。

## 共有CodeKB更新

次の9成果物へ最新断面を先頭追加し、既存の過去断面を保持した。

1. `business-overview.md`: 利用者価値、owner 0件、M7/M8 BLOCKER候補。
2. `architecture.md`: value chainとcanonical→manifest→composed runtimeのInteraction Diagrams。
3. `code-structure.md`: formal source、stage、spec、tests、未登録2sourceの配置。
4. `api-documentation.md`: model-map v2、receipt、advisory、CLIと不在API。
5. `component-inventory.md`: missing authoring ownerとmissing import-closure guard。
6. `technology-stack.md`: Bun / TS / Biome / TLC / JDK / Docker。
7. `dependencies.md`: requirements/designからformalへの未配線とcomposed dependency欠落。
8. `code-quality-assessment.md`: fresh 44 pass対exit 1、projection test gap、coverage/CI/debt。
9. `reverse-engineering-timestamp.md`: base / observed / 21 commits / 828 files / rebase tree delta / focus。

## 残る論点

- Requirements Analysis: import-closure2件を同Intent修復するか、hard dependency付き別Issueにするか。
- Requirements Analysis / Application Design: authoring ownerを新規stageとoverlayのどちらへ配置するか。
- Application Design: requirement/design identity粒度、trace/reduction/proof receipt schema、registration原子性。
- M7/M8: canonical directだけでなくfresh composed harnessでexecutorを実行するE2Eを受け入れ証拠に含めること。
