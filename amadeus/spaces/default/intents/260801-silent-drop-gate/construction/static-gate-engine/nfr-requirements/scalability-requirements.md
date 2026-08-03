# Scalability Requirements — static-gate-engine

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、repository規模の増加に対する短命CLIのcapacity契約を定義する。常駐serviceの水平scaleやrequest RPSは非適用である。

## スケール軸

| 軸 | 測定値 | 要求 |
| --- | --- | --- |
| source規模 | expected file数、総bytes | 全regular authored sourceを欠落なく処理し、規模増加をscan省略へ変換しない |
| AST規模 | semantic universe node数 | TypeScript ASTから独立した母集合を1回構築し、ast-grep candidateとの全単射を保つ |
| candidate規模 | rule別candidate数 | included／excluded／unresolvedを全件閉じ、件数増加でunresolvedを無視しない |
| finding規模 | raw／effective identity数 | identity byte順で決定的にsortし、baseline／exemptionを集合演算で評価する |
| ledger規模 | previous／current identity数 | subset、added、removed、replacementを単一の正規化集合モデルで判定する |

## Capacity要件

- 基準負荷 `L0` は revision `83fb16a253874a6eb214febec1ed3c07249b4603` の3 authored rootsを要件どおり除外した実測値、261 files／3,920,036 bytesとする。実装後のbenchmarkではcandidate数、AST node数、peak RSSも同じevidenceへ追記する。
- 拡大負荷 `L2` は `L0` の全対象をpath衝突なく2組へ複製した522 files／7,840,072 bytes、`L4` は4組へ複製した1,044 files／15,680,144 bytesの決定的synthetic repository fixtureとする。各組のrule candidate比率とledger identity数は `L0` と同じに保つ。
- `L0` はPERF-SG-01／02の15秒上限とprocess-tree peak RSS 2 GiB以下、`L2` は30秒・2 GiB以下、`L4` は60秒・3 GiB以下で完全走査を終える。RSSは `tests/tools/rss-tree-sampler.ts` が10msごとにroot Bun PIDと `/proc` で列挙した全descendantの `VmRSS` を同時合計した最大値とし、ast-grep／Git childを含む。いずれもexpected／scanned全単射と走査前後manifest一致を必須とする。
- filesystem列挙、manifest、candidate、finding、ledger差分は入力規模に対して線形またはsortを含む `O(n log n)` を上限とし、全要素同士の総当たり比較を導入しない。
- sourceごとのast-grep spawn、candidateごとのTypeScript Program再構築、findingごとのGit呼出を禁止する。
- scan対象が0件、root欠落、resource exhaustion、timeoutの場合は縮退Passせずtyped Errorを返す。
- concurrencyを性能の前提にしない。単一process／単一ast-grep invocationで決定性とresource上限を優先する。

## 拡張時のtrigger

次のいずれかを検出した場合は、黙ってscanを減らさずcapacity reviewを行う。

1. coldまたはwarmの最大値が15秒を超える。
2. ast-grep invocationが1回を超える。
3. `L0`／`L2`／`L4` の時間上限またはpeak RSS上限を超える。
4. 新しいauthored root、language、rule、status-return catalog追加が提案される。
5. finding／candidate数の増加によりJSON evidenceがレビュー不能な規模になる。

catalog追加は性能最適化ではなく要件変更であり、fixture、全候補census、再測定、人間再承認を同一変更で要求する。

## Scaling方針

- 第一選択はsnapshot読取りの共有、単一Program、candidate限定control-flow評価、canonical集合演算である。
- sharding、parallel worker、incremental cacheは初期実装へ導入しない。これらは順序、snapshot authority、partial-scan oracleを複雑化するため、実測で15秒を満たせない場合だけ設計変更として検討する。
- cacheを導入する場合でもrevision、config、tool receipt、manifest digestへ完全にbindし、cache miss／破損をPassへ変換しない。
- 複数process化する場合はexpected/scanned全単射とsource前後digestを全shard横断で再構成し、欠落shardを `SCAN_PARTIAL` とする。

## 検証要件

- 小fixture、`L0`、`L2`、`L4` でfile数、bytes、candidate数、AST node数、elapsed time、process-tree peak RSS、sampler digest、sample数、観測PID数を記録する。
- source数とcandidate数を独立に増加させ、semantic evaluationが不要なcandidate外nodeの増加で非線形化しないことを確認する。
- 重複path、欠落receipt、余剰receipt、途中変更を規模に関係なく検出する。
- capacity超過時もstdoutが閉じたError schema、findings空、exit 2を維持する。
