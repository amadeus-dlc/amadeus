# Driver Contract & Selection Policy Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。U-01はstateless local moduleであり、service replica、load balancer、database、queue、shardを持たない。scale dimensionはUnit/topology signal数`n`とcapability row数`c`である。

## Stateless scaling architecture

| Concern | Design |
|---|---|
| per-call state | stack/local immutable collectionsだけ。call終了時に破棄 |
| shared state | frozen driver/harness/candidate/reason tablesだけ。mutationなし |
| topology | stable sort + adjacent dedupe、`O(n log n)`/`O(n)` |
| capability | fixed candidate setをkey indexし、`O(c)` |
| concurrency | global lock/cacheなし。同時callerは独立pure evaluation |
| capacity limit |既存swarmのcaller contractを維持し、U-01で拡張しない |

horizontal scaleはcaller process側で自然に成立する。U-01にreplica coordinationやdistributed stateを追加する必要はない。

## Data organization and load distribution

`TopologyNormalizer`はinput orderをcanonical orderへ変換するが、Unitの集合・意味をdropしない。collectionは次の順で扱う。

1. Unit slug/kindをclosed validatorへ通す。
2. `unitSlug + fixed kind rank`でstable sortする。
3. 完全一致する隣接rowだけをdedupeする。
4. coordination/independent bitをsingle passで集約する。
5. normalized Unit setとclassificationをimmutable valueとしてselectorへ渡す。

partition/shardingは行わない。provider固有wave分割はU-05、process concurrencyはU-02〜U-05のownerへ残す。

## Closed-set growth policy

| Dimension | Current design | Change procedure |
|---|---|---|
| public requested value | 5 | schema version、docs、all harness testsを同時変更 |
| native driver | 4 | provider ownership、registry、candidate table、release closureを同時変更 |
| harness | 4 | support matrix、legacy/auto table、distributionを同時変更 |
| output topology class | 3 | `coordinated` / `independent` / `unknown`のschema、normalizer、candidate tableを同時変更 |
| classification fixture row | 4 | coordination/independent signalの有無4組合せとprecedence reasonを同時変更 |

driver/harnessの追加をruntime plugin discovery、unknown descriptor、catch-all branchで吸収しない。別Intentのcontract changeとしてcompile exhaustivenessを要求する。

## Capacity and degradation behavior

- valid inputは全件評価し、sampling、partial result、best-effort selectionを行わない。
- invalid/over-limit inputはcaller/boundary validatorでtyped errorにし、暗黙truncateしない。
- explicit unavailableはfloor/別nativeへdegradeしない。
- `auto`だけがfixed candidate chainをdispatch前に進み、reason/detailsを完全保持する。
- cache/queue/replica不足というfailure modeは構成要素がないため非適用。

## Scalability verification

- generated `n` size ladderでoperation countが`O(n log n)`を超えないことを確認する。
- input order/duplicate変形後もnormalized set/classification/digestが一致するpropertyを検証する。
- parallel pure-call testでshared mutation、result cross-talk、cache growthが0件であることを確認する。
- architecture testでworker pool、queue、database、network、runtime discovery dependencyが0件であることを確認する。
- fixed-set追加はexhaustive compile fixture、docs/release coverageなしではbuildを通さない。
