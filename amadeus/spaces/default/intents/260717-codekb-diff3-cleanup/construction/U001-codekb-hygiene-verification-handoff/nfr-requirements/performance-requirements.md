# Performance Requirements — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Applicability

`business-logic-model.md` が示すとおり本unitはruntime service、API、UI、database、queueを追加しない。従ってresponse time percentile、request throughput、concurrent user、CPU / memory ceilingのproduct targetは非該当である。`requirements.md` NFR-3に従い、根拠のない「高速」や架空のp95 / p99を設定しない。

`technology-stack.md` のBun / TypeScript / Git基盤は変更せず、`business-rules.md` のexact validationを既存git objectとMarkdown本文へ適用する。性能上の価値は、速さの主張ではなく、対象を欠落させず有限回の走査で完了することである。

## Testable Requirements

### NFR-PERF-1: Measurement completeness

1回のcontent検査は同一`MeasurementRef.sha`に対し、次の全12値を記録しなければならない。

- Marker: 2 path×4語彙=`8`個の個別件数。
- Heading: 2 path×`latest` / `history260715`=`4`個の個別件数。

Pass targetは12/12=`100%`のfield実在であり、合計値への縮約や未測定fieldの0埋めを許容しない。

### NFR-PERF-2: Bounded processing

対象2 pathの総行数を`N`としたとき、marker / heading検査は各行を有限回評価する`O(N)`の全数走査として実行する。ネットワーク呼出し、remote service、database scan、retry loopを処理経路へ追加しない。完了時間の絶対targetはmachineとrepository sizeのbaselineがないため設定せず、同一runで測定漏れがないことをgateとする。

### NFR-PERF-3: No unnecessary repeated work

- Fix commit祖先性はcontent scanと別に1回記録する。
- Pre-landing結果をlanded main検査の代理にしない一方、同一phase内で同じSHAの一部だけを無理由に再計測して混在させない。
- Refが変わった場合は全12値を新しいevidence setとして再生成する。

## Benchmark and Validation Method

| Scenario | Load condition | Metric | Target |
|---|---|---|---|
| Pre-landing scan | 固定branch SHA、対象2 path | required fields | 12/12 present |
| Repeatability run | 同じSHA、同じcommand / pattern | count tuple equality | 12/12 equal |
| Changed ref | 新しい明示SHA | evidence isolation | old/new field混在0件 |
| Landed-main scan | human landing後の明示main SHA | newly measured fields | 12/12 present、pre-landing copy 0件 |

Load test、stress test、soak test、auto-scaling validationは常駐workloadがないため非該当。Build and Testでは全数性、tuple一致、ref分離を検証対象とする。

## Resource and Failure Boundary

検査失敗、timeout、process interruption時は部分結果を`gate-ready`へ昇格しない。再実行時は明示SHAから完全なevidence setを作り直す。performanceを改善するために検査語彙、対象path、H2条件、audit記録を減らしてはならない。
