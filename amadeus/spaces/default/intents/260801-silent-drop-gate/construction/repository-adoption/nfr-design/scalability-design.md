# Scalability Design — repository-adoption

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、corpus、evidence、ledger、CI event、harness projectionの増加をrepository acceptanceへ接続する。

## Capacity fixture

`tests/integration/t-no-silent-drop-repository-capacity.test.ts` のseed `repository-adoption-capacity-v1` を唯一のgenerator正本とする。使い捨て隔離Git workspaceに正規の3 authored rootを作り、R0 sourceを `replica-0000` から始まる衝突しないnamespaceへ複製する。本番checkoutは変更しない。pathが変わるためR0のidentity digestをapproved pre corpusと同一とはみなさず、approved preからはfile／byte／shape比率だけを継承する。

| load | replica | elapsed | complete condition |
| --- | ---: | ---: | --- |
| R0 | 1 | cold／warm 15秒 | U1 approved pre census母集団と一致 |
| R2 | 2 | 20秒 | nonzero軸exactly 2倍、zero軸0 |
| R4 | 4 | 25秒 | nonzero軸exactly 4倍、zero軸0 |

generator manifestはschema、seed、source revision、replica path／SHA-256、expected files／bytesをcanonical byte順で持つ。R0／R2／R4ごとにU1公開 `census-evidence` → classification → approval → `baseline-candidate` を事前実行したreview済み `CapacityFixtureReceipt` をchecked-in fixture registryの正本とする。receiptはscale、source manifest digest、candidate／finding identity digest、exact current baseline／exemption bytes＋digest、base ledger bytes＋digest、base commit tree digestを持つ。U4はidentityを計算せずexact bytesをmaterializeする。

capacity harnessは各scaleのisolated Git repositoryにbase commitを作り、receiptのbase ledgerを配置する。head commitには同じsource母集団とreceiptのcurrent ledgerを配置し、base full SHAをU1 root gateへ渡す。これによりU1 `GitReadPort` とratchetを本番経路のまま実行する。receiptとU1再census digestが一致しなければgateを起動しない。

## Scale algorithm

- classification、approval、candidate、ledgerはidentity keyのMap／Setで全単射と集合差分を行い、最終sortだけ `O(n log n)` とするU1実装を消費する。
- U4はU1 focused complexity testのcommand、full revision、exit、output digestをreceiptとして検証し、独自 `identityOps` seamや構造検査を追加しない。
- raw artifactは一度だけ保存し、reportはpath＋digest参照にして全内容を複製しない。
- CI event数やfinding数にかかわらずbase確認最大2、fetch最大1、root gate 1を維持する。
- packager manifestから全projectionを導出し、固定harness listで打ち切らない。

## Scale acceptance

R0／R2／R4はU1公開CLIだけを呼び、files、bytes、candidate、finding、baseline、exemptionの各count／digestをscale別fixture receiptへexact照合する。R0はapproved preとcount／shape比率を比較するが、path由来identity digestはfixture固有値を使う。elapsedは絶対上限に加え `R2 <= 3 × R0`、`R4 <= 6 × R0` を満たす。missing complexity receipt、revision mismatch、母集団差異は不合格である。

raw／classificationを独立に増やすfixtureで不足・余剰・重複identityを拒否する。0件軸は0の期待値をmanifestへ明示し、倍率計算で架空identityを生成しない。

## 拡張trigger

authored root、language、rule、semantic catalog、CI event、remote、artifact store、harness projectionの追加、またはR0／R2／R4上限超過でcapacity reviewを要求する。性能対策としてscan sampling、ledger／exemption growth、partial projectionを許可しない。

sharding、incremental cache、distributed serviceは初期導入しない。必要時もmanifest全単射、trusted base ratchet、単一GateResultを維持する別設計とする。

## 検証項目

- 固定commandでR0／R2／R4のmanifest digest、counts、elapsed、process count、GateResult digestを記録する。
- U1 complexity receiptの未実行／不一致をrepository acceptance failureにする。
- base object既存／欠落／取得不能でprocess上限とblocking outcomeを確認する。
- packager manifest全projectionの生成／drift checkを件数とdigestで検査する。

service RPS、autoscaling、database partition、multi-regionは短命repository CLIには非適用である。
