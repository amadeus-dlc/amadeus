# Performance Test Instructions — silent-drop-gate

## 上流成果物とNFR

本書は4 Unitの `code-generation-plan.md`、`code-summary.md`、各 `performance-requirements.md`／`scalability-requirements.md` を入力とする。常駐serviceやHTTPはないため、RPS、load、soakは非適用であり、短命CLIの完全走査、call-count、cold／warm、capacityを測る。

## 実行方法

```bash
bun test --timeout 120000 \
  tests/perf/no-silent-drop-adoption.perf.test.ts \
  tests/perf/t-no-silent-drop-text-mutation.test.ts
```

この統合performance suiteが実装treeで直接検証する範囲は次のとおりである。

- static gate／repository adoption: cold 5回＋warm 5回が各15秒未満
- capacity: R0／R2／R4のshrink-only populationと境界
- text mutation: L1／L4／L8、L8は256 stage／256 target、warm 10回、1秒／RSS増分128 MiB以下

mirror persistenceのtransition／maintenance／retry／audit call-countはfocused unit／integrationで検証する。text mutationは専用性能suiteでsuccess、末尾not-found、duplicate-targetを同一L8 fixture上で直接測定する。

## 測定条件と合格条件

- Bun 1.3.13、同一revision、固定seed／fixture、warmupをsuite定義どおり使用する
- 全sampleがfiniteかつ非負で、閾値超過、timeout、retry、partial scanを0件とする
- expected／scanned全単射、走査前後manifest一致を性能達成の前提とする
- 性能不足をsource除外、semantic検査省略、warning success、cache、暗黙retryで隠さない
- 実測値はcanonical adoption evidenceにも結合されているため、registry validatorとartifact digestをintegration testで再検証する
- text-mutation L8の10測定すべてが閾値内で、fixture digestとbyte budgetが決定的であること
