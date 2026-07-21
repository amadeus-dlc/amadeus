# Code Generation Plan: runtime-recovery

## 目的

runtime graph の Bolt DAG cache が欠落・破損・陳腐化しても canonical dependency artifact からread-sideで回復し、gate revision証拠が欠落したapproveを既存audit lock内の単一atomic batchとして安全に補完する。

## 公開境界

- `packages/framework/core/tools/amadeus-lib.ts` に pure seam `recoverBoltDag` と `recoverGateRevision` の2件だけを追加する。
- `amadeus-orchestrate.ts` は回復済みDAG resultだけをper-unit coverage / selection / swarmへ渡す。第二fallbackを作らない。
- `amadeus-state.ts` と `amadeus-audit.ts` は既存approve / audit lock内で5 blockの生成・検証・atomic commit・state retryを行う。新event、store、service、runtime dependencyは追加しない。

## 手順

1. [x] 上流requirements、functional/NFR design、既存runtime/orchestrate/state/audit ownerを照合する。
2. [x] `t247` unitでDAG source/cache matrix、canonical comparison、revision chronology/predicateをRED固定する。
3. [x] `t247` integrationで3 consumer同一Unit集合、diagnostic、approve 5-block atomicity、failure injection、state-write retryをRED固定する。
4. [x] `recoverBoltDag`を既存`parseBoltDag`再利用で実装し、artifact absentだけを`none`、broken sourceを`malformed`にする。
5. [x] orchestrateのDAG read-sideを単一recovery resultへ接続し、runtime graphへのwrite 0を維持する。
6. [x] `recoverGateRevision`をTimestamp+buffer position、organic anchor、human pivot、declared producesだけのclosed predicateとして実装する。
7. [x] 5 blockを事前生成・全数検証し、既存audit lock内のatomic commit後に最終stateだけをwriteする。完全batch済み/state未反映のretryはaudit追加0で収束させる。
8. [x] t247 RED→GREENと既存t133/t186/t211/t115/t17回帰を完走する。
9. [x] typecheck、lint、complexityをGREENにし、追加公開面が正準2 seamだけであることを固定する。
10. [x] package 6面とself-install 4面を正規generatorだけで再生成し、dist/promote drift 0を確認する。
11. [x] full CI→coverageを他runnerなしで直列実行し、既知M16以外の赤0、exact patch 100%、allowlist 0を確認する。
12. [ ] directive sensors、code-summary、hash、独立review、Formal review、§13を完了する。

## 禁止事項

- broken canonical sourceのzero-unit降格、consumer別fallback、read-side persistent heal。
- 1行audit emitの5回呼出、partial append、disk上の中間`[R]` / `[?]` state。
- 新event / schema / database / queue / UI / runtime dependency / threshold / allowlist。
- generated harnessや別Unit成果物の手編集。

## 完了条件

- t247と関連回帰がGREENで、DAG回復とrevision backstopのpositive/negative/failure-injectionが固定される。
- audit/state failure時は呼出前bytes不変、state-write retryはaudit重複0で最終stateへ収束する。
- package 6 / self 4、full / coverage、patch gate、sensor、Formal reviewがGREENである。
