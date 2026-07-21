# Code Generation Plan: runtime-recovery

## 目的

runtime graph の Bolt DAG cache が欠落・破損・陳腐化しても canonical dependency artifact からread-sideで回復し、gate revision証拠が欠落したapproveを既存audit lock内の単一atomic batchとして安全に補完する。

## 入力縮退とスコープ追跡

User Stories stageはengine正本で`SKIP`されている。そのためstory-to-step mappingは、captured intent「Implement the approved upstream AI-DLC v2.2.0-to-v2.3.0 sync plan (docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md): 24 ADOPT/ADAPT items incl. the 2.3.0 plugin mechanism; run ideation only, then park」への直接対応へ縮退する。本Unitはcaptured intentだけをscope根拠とし、engineが分解したU02 runtime-recoveryをapproved sync planのruntime correctness部分として実装する。requirementsとfunctional/NFR designはこの境界を具体化するが、captured intent外のscopeを追加しない。

## 公開境界

- runtime挙動の公開境界として、`packages/framework/core/tools/amadeus-lib.ts` に pure seam `recoverBoltDag` と `recoverGateRevision` の2件だけを追加する。
- `amadeus-orchestrate.ts` は回復済みDAG resultだけをper-unit coverage / selection / swarmへ渡す。第二fallbackを作らない。
- `amadeus-state.ts` と `amadeus-audit.ts` は既存approve / audit lock内で5 blockの生成・検証・atomic commit・state retryを行う。新event、store、service、runtime dependencyは追加しない。
- `validateRecoveredApprovalBatch`は`amadeus-state.ts`内部helperのままとし、production approve pathから検証する。CLI、event、export、永続化、runtime serviceの契約を増やさない。

## 手順

| Step | 状態 | 作業 | Captured intentへの対応 |
|---|---|---|---|
| 1 | [x] | 上流requirements、functional/NFR design、既存runtime/orchestrate/state/audit ownerを照合する。 | approved v2.2.0→v2.3.0 sync planのU02 runtime correctness範囲を確定する。 |
| 2 | [x] | `t247` unitでDAG source/cache matrix、canonical comparison、revision chronology/predicateをRED固定する。 | U02 ADOPT/ADAPT項目を決定的なunit契約へ落とす。 |
| 3 | [x] | `t247` integrationで3 consumer同一Unit集合、diagnostic、approve 5-block atomicity、failure injection、state-write retryをRED固定する。 | U02 ADOPT/ADAPT項目をproduction path契約へ落とす。 |
| 4 | [x] | Comprehensive test strategyを既存Bun test runner、`tests/run-tests.ts`、`package.json`の`test:ci` / `coverage:ci`、既存coverage registry / ratchet / allowlistへ接続する。新しいtest configuration fileは不要であり、既存設定が不変であることを検証する。 | approved sync planを既存repository test configuration内で検証し、scopeを増やさない。 |
| 5 | [x] | `recoverBoltDag`を既存`parseBoltDag`再利用で実装し、artifact absentだけを`none`、broken sourceを`malformed`にする。 | U02のBolt DAG self-heal ADOPT/ADAPTを実装する。 |
| 6 | [x] | orchestrateのDAG read-sideを単一recovery resultへ接続し、runtime graphへのwrite 0を維持する。 | approved sync planのruntime consumer convergenceを実装する。 |
| 7 | [x] | `recoverGateRevision`をTimestamp順、同一shard内buffer position、cross-shard timestamp collisionのfail-closed、organic anchor、human pivot、declared producesだけのclosed predicateとして実装する。 | U02のgate revision backstop ADOPT/ADAPTを実装する。 |
| 8 | [x] | 5 blockを事前生成・全数検証し、既存audit lock内のatomic commit後に最終stateだけをwriteする。完全batch済み/state未反映のretryは同一transaction内の連続5-block windowを同じvalidatorで再検証し、完全windowが一意な場合だけaudit追加0で収束させる。 | approved sync planのrecovery atomicityを既存境界内で実装する。 |
| 9 | [x] | t247 RED→GREENと既存t133/t186/t211/t115/t17回帰を完走する。 | U02変更が既存runtime contractを退行させないことを証明する。 |
| 10 | [x] | typecheck、lint、complexityをGREENにし、追加公開面が正準2 seamだけであることを固定する。 | approved sync planの品質制約を満たす。 |
| 11 | [x] | package 6面とself-install 4面を正規generatorだけで再生成し、dist/promote drift 0を確認する。 | v2.3.0 sync成果を全harnessへ正規投影する。 |
| 12 | [x] | full CI→coverageを他runnerなしで直列実行し、赤0、patch coverage 100%、coverage allowlist 0を確認する。 | approved sync planのrepository全体互換性を証明する。 |
| 13 | [ ] | 最終directive sensors、code-summary、hash、独立review、Formal I2、§13を完了する。 | captured intentのU02をengine正本へREADYとして返す。 |

## 禁止事項

- broken canonical sourceのzero-unit降格、consumer別fallback、read-side persistent heal。
- 1行audit emitの5回呼出、partial append、disk上の中間`[R]` / `[?]` state。
- 新event / schema / database / queue / UI / runtime dependency / threshold / allowlist。
- generated harnessや別Unit成果物の手編集。

## 完了条件

- t247と関連回帰がGREENで、DAG回復とrevision backstopのpositive/negative/failure-injectionが固定される。
- audit/state failure時は呼出前bytes不変、state-write retryはaudit重複0で最終stateへ収束する。
- package 6 / self 4、full / coverage、patch gate、sensor、Formal reviewがGREENである。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-21T23:13:16Z
- **Iteration:** 1
- **Scope decision:** none

stage contract違反、公開境界の自己矛盾、変更・検証証跡の列挙不足によりレビュー可能な完了状態ではない。

### Findings

- code-generation-plan.mdは、storiesがSKIPされた場合に必須となる各Stepからcaptured intentへのtraceabilityとintent-onlyでscopingした旨を記録せず、必須のtest configuration Stepも欠いている。
- U02の公開seamをrecoverBoltDag/recoverGateRevisionの2件に限定するとしながらvalidateRecoveredApprovalBatchをexportしており、unit-of-work、plan、summary間で公開境界が自己矛盾している。
- code-summary.mdは変更した既存DAG fixture 4件、audit drift meta-test、t186/t199 fixture、生成投影の正確なpathを列挙せず、coverage CIのlog pathも示していないため、Files created/modifiedと最終検証証跡をscope成果物だけから追跡できない。
- 複数audit shardでTimestampが同一かつshard内bufferPositionも同一になり得る場合の決定的tie-breakが定義されず、Timestamp+bufferPositionだけではNFR-1のtotal orderを保証できない。
