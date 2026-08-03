# Scalability Design — static-gate-engine

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。短命CLIを水平scaleせず、source、AST node、candidate、finding、ledgerの各増加軸を同一snapshot上で線形または `O(n log n)` に閉じる。

## Capacity model

| 負荷 | files | bytes | elapsed上限 | process-tree peak RSS |
| --- | ---: | ---: | ---: | ---: |
| L0 | 261 | 3,920,036 | 15秒 | 2 GiB |
| L2 | 522 | 7,840,072 | 30秒 | 2 GiB |
| L4 | 1,044 | 15,680,144 | 60秒 | 3 GiB |

L2／L4 fixtureはL0をpath衝突なく2組／4組へ複製し、candidate率とledger identity率を一定にする。全runでexpectedCount=scannedCount、重複0、走査前後manifest一致を必要条件とし、速度やRSSだけでは合格しない。

## データ構造と複雑度

| 対象 | 所有構造 | 複雑度上限 |
| --- | --- | --- |
| manifest／snapshot | normalized path keyのordered array＋Map | 構築 `O(n)`、最終sort `O(n log n)` |
| coverage receipt | path＋snapshot digestのMap | expectedとの全単射 `O(n)` |
| semantic universe | fileごとのflat candidate reference array | AST walk `O(nodes)` |
| candidate census | candidate identity keyのMap | structural／semantic join `O(candidates)` |
| finding／exemption | identity keyのSet／Map | 適用 `O(findings + exemptions)` |
| baseline ratchet | previous／current identity Set | subset／added／removed `O(ledger)` |
| rendering | identity byte順のarray | sort `O(n log n)`、serialize `O(n)` |

同一要素の線形探索をnested loopへ入れず、全件比較はcanonical identity mapのjoinとして実装する。policy findingもsource findingと同じidentity orderingへ投影し、location欠落を特別な再走査へ変換しない。

## ProcessとI/O scaling

規模にかかわらずBun parent 1、ast-grep child 1、Git child最大2を固定する。ast-grep bundleはcandidate rulesとcoverage sentinelを同梱し、source／rule単位spawnを禁止する。TypeScript Program／TypeCheckerも各1個とし、candidate単位で再構築しない。

source bytesは`SourceSnapshotStore`が一つだけ所有し、TypeScript overlayが共有する。ast-grep mirrorはdisk派生物とし、process内に第二のfull byte corpusを保持しない。findingはsource textを複製せず、identity、rule、path、span、固定message parameterだけを保持する。

## Overloadと拡張trigger

zero source、root欠落、timeout、resource exhaustion、RSS超過、receipt欠落を縮退Passへ変換しない。L0／L2／L4のいずれかで上限を超えた場合、次を順に検討する。

1. 重複snapshot／token／string保持の削減。
2. candidate外nodeに対する詳細control-flow処理の除去。
3. Map／Set joinとsort keyの一度生成。
4. それでも満たさない場合のみ、snapshot authorityと全shard receiptを保つsharding設計を別承認する。

parallel worker、incremental cache、partial scanは初期設計へ含めない。新しいauthored root、language、rule、status-return catalogはcapacity optimizationではなくscope changeとして扱い、fixture、census、baseline evidence、人間承認を更新する。

## Scale verification

`tests/tools/rss-tree-sampler.ts` が10ms間隔でBunと全descendantを観測し、sampler digest、sample数、観測PID数と同時最大RSSを保存する。各L0／L2／L4 runでfile数、bytes、AST node、candidate、finding、ledger、elapsed、child count、source read count、manifest digestを一つのrecordへ残す。

- sourceだけを増やすfixtureとcandidate密度だけを増やすfixtureを分け、semantic path評価がcandidate数へ比例することを確認する。
- rule欠落、receipt重複、途中変更を各scaleで注入し、規模増加によって検出が省略されないことを確認する。
- L4でもstdoutは閉じたResult schema、identity順、Error時findings空を維持する。
- process数とProgram数をcounter assertionで固定し、childやProgramへ負荷を隠して見かけ上の親RSSだけを下げない。

## 非適用事項

autoscaling、load balancer、queue、database partition、multi-region、network rate limitは存在しない。capacityは単一repository checkout上の決定的batch処理として管理する。
