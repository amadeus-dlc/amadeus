# Scalability Design — mirror-persistence-propagation

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。単一ローカルstateを排他的に更新する短命CLIであるため、horizontal scaling、load balancer、sharding、auto-scalingは非適用である。

## スケール軸と設計

| 軸 | 設計 | 上限の証明 |
|---|---|---|
| state bytes | business stateとembedded outboxを単一parse／renderし、digestをsnapshotで共有 | serialization回数とbytes比 |
| audit件数 | transaction identityで一件検索し、同一identityの新規appendは最大1件 | append count、重複identity 0 |
| outbox | Mirror state block内のpending transactionを完全な単一recordで保持 | state内record数が0または1 |
| failure points | port単位のtable-driven injection | failure数に対してtest caseが線形増加 |
| harness projection | canonical sourceをpackager manifest全件へ投影 | drift guard、直接編集0件 |

## 容量増加時の制御

`AtomicStatePort.executeExclusive` はexclusive lock内でembedded outboxの有無を一度判定する。outboxがある場合は一回のmaintenance passとしてaudit appendを最大1回試み、成功またはalready-presentならoutbox clear用state writeを最大1回試みてreturnする。outboxがないcurrent invocationはstate＋outboxを一回だけrender／renameし、clearを次回へ送る。これにより一回のinvocationが二重serializationや複数business operationへ膨張しない。

state parse、render、digestは入力bytesに対して線形で実装し、同じdocumentの全section同士を比較する二重loopを導入しない。audit lookupは既存transaction identity index／scan contractを再利用し、本Unitだけのcacheや第二indexを追加しない。

## Capacity fixture

Build and Testでは次のfixture群を使う。

- `S0`: repositoryの代表state、audit、outbox
- `S2`: stateの非対象sectionと既存audit entryを2倍にした決定的fixture
- `S4`: 同じ次元を4倍にした決定的fixture
- `F`: lockからdirectory fsyncまでの全failure injection

各fixtureでlock acquire／release、parse、render、digest、append、clear、`applyTransition`、retryの回数とbefore／after digestを記録する。`S2`／`S4`でもcurrent transition評価は0または1、同一transaction appendは最大1、embedded outboxは最大1、同じphaseのretryは0を維持する。

## 劣化方針

- OS timeout、resource exhaustion、想定外容量をwarning successへ変換しない。
- stateの一部section、audit照合、outbox検証をsamplingしない。
- cache、parallel worker、daemon、queueを性能対策として導入しない。
- 容量超過時はtyped failureと証跡を返し、入力上限または実装最適化を別の設計変更として扱う。

## 拡張trigger

multi-writer、remote storage、常駐service、並列transition、複数outbox record、別runtime projectionが必要になった場合は、本設計の単一writer／単一invocation境界を流用せずscope changeとcapacity reviewを行う。
