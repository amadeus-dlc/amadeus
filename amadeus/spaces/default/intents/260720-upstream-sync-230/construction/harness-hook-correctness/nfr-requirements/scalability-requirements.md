# Scalability Requirements — harness-hook-correctness

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。U07はローカルframework配布面の修正であり、利用者trafficに応じて水平scaleするserviceではない。scalabilityは固定されたharness/projection fan-outとevent処理の有界性として定義する。

## Capacity境界

| ID | Dimension | Target | 検証 |
|---|---|---|---|
| SCALE-U07-01 | harness inventory | 現行6 harnessを全数検査し、該当spawn siteだけを更新する。 | inventory 6面の検査完了、不要wrapper追加0件。 |
| SCALE-U07-02 | Claude command inventory | 承認済み11 hook commandを全数変換・検査する。 | command件数11、未引用0、欠落path 0、対象外bytes差分0。 |
| SCALE-U07-03 | self-install境界 | 現行4 self-install面を増減せず、U07の配布対象と混同しない。 | manifest/package checkでclosed list不変。 |
| SCALE-U07-04 | event fan-out | 同一host eventから同じcanonical actionを重複生成しない。 | positive/negative対照fixtureで重複successとfalse successがない。 |

6/4/11は将来予測ではなく、`requirements.md`と`technology-stack.md`が固定する現行closed inventoryである。harnessやhookが正規手順で追加される場合は、source manifestとgeneratorから新しいinventoryを導出し、本NFRの数値を黙って拡張しない。

## Scaling strategy

- scale-out mechanismは既存manifest-driven package generatorであり、各harnessへの手作業copyではない。
- sourceを一度検証してcanonical sort/orderでprojectionし、同一sourceから同一bytesを生成する。dist treeを第2正本にしない。
- adapter event処理は単一payloadと必要なaudit tailに閉じ、directory全走査、glob拡張、無制限history scan、retry queueを追加しない。
- runtime service、load balancer、database sharding、cache、autoscaling infrastructureは対象外であり、導入しない。

## Capacity validation

package生成前後で6 harness projectionのbyte/orphan/unreferenced driftを検査する。Claude面はauthored settingsと生成projectionをparseし、11 command、statusline、permission globを別集合として比較する。Kiro IDE面はpositive/negative fixtureを対にし、event数が入力数に対して線形かつ重複なしであることを確認する。

## トレーサビリティ

SCALE-U07-01〜04は`business-rules.md`のBR-U07-03、05〜11、`business-logic-model.md`のFlow A〜C、`requirements.md`のFR-4、NFR-1、NFR-4、C-2〜4、`technology-stack.md`の6 harness/4 self-install配布構成に対応する。
