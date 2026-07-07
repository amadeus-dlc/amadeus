# Performance Design — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Design Goals

U4の性能設計は、source metadata、target detection、target snapshot から `FileOperationPlan` を純粋に作ることに限定する。`performance-requirements.md` の通り、archive fetch、target traversal、prompt、file copy、backup write、manifest write、verification はU4の性能経路に含めない。

## Planning Algorithm

| Planner path | Budget | Design |
|---|---:|---|
| clean install 2,000 files | p95 <= 250ms | metadata orderで1回走査し、absent snapshot rows を `add` にする。 |
| manifest-installed upgrade 2,000 files | p95 <= 350ms | manifest previous md5 と source md5 と snapshot md5 を map lookup で比較する。 |
| manual-or-unknown 2,000 files | p95 <= 350ms | shared unknown/changed を conservative branch に通し、backup required にする。 |
| 500 backup candidates | p95 <= 100ms | 1つのoperation timestampを共有し、collision predicate は候補がある時だけ呼ぶ。 |
| version no-write | p95 <= 20ms | version decision table を先に評価し、file planningへ進まない。 |

source metadata と snapshot は normalized path を key にした `Map` に変換する。planning本体は O(n) を基準とし、backup path collision suffix のみ predicate 呼び出し回数に依存する。sort が必要な場合は deterministic output のための O(n log n) まで許容する。

## Resource Constraints

Plannerは次を直接呼ばない。

- filesystem read/write;
- network;
- prompt;
- reporter;
- applier;
- manifest store;
- md5 hashing.

`backupPathExists` は injected predicate として扱い、backup candidate がない file では呼ばない。これにより `performance-requirements.md` の accidental broad filesystem traversal を防ぐ。

## Benchmark Plan

U6で pure unit benchmark を作る。

| Benchmark | Fixture |
|---|---|
| clean install | 2,000 absent snapshot rows |
| manifest upgrade | 2,000 entries with same/changed/unknown md5 mix |
| manual-or-unknown | shared file unknown md5 fixture |
| backup generation | 500 changed shared files and collision predicate |
| version no-write | equal/downgrade/installed-newer/default latest branches |

正しさの失敗は性能結果より優先する。`FileOperationPlan` が unsafe `canApply:true` を返す場合、時間内でもfailにする。

## Non-Goals

- streaming planner は初期実装では導入しない。
- persistent cache は導入しない。
- parallel planning は導入しない。
- Reporter用の最終文言生成は行わない。
- U5 apply最適化やmanifest write最適化は扱わない。

## Upstream Coverage

- `performance-requirements.md`: p95 budget、measurement protocol、resource constraints を設計に反映した。
- `security-requirements.md`: unsafe plan prevention と no filesystem access を性能経路でも維持する。
- `scalability-requirements.md`: 2,000 files、500 backups、pure calls、no shared state を前提にした。
- `reliability-requirements.md`: deterministic plan、backup ordering、no-write reason を性能より優先する。
- `tech-stack-decisions.md`: TypeScript/Bun、pure function planner、injected predicate 方針に従う。
- `business-logic-model.md`: install/upgrade planning workflow、backup path workflow、output contract に沿う。
