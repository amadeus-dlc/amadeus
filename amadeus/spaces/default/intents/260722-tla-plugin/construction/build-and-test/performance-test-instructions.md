# Performance Test 手順

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

## 性能契約

- plugin compile回帰 `INT-U2-PLUGIN-PERF`: 100 plugins × 1 stage × 4 KiBで、0-plugin baselineに対する中央値追加率20%以下。
- plugin capacity: 100 plugins × 10 stages × 4 KiB（合計4,096,000 bytes）を10秒未満、入力64MiB以下で処理。
- model-completeness: 100 entries・合計10MiBを全試行10秒未満。
- TLC: warm-up 1回＋計測5回の各spawn/CLIが180秒未満、stream各16MiB以下、container残留0。

## 実行方法

```bash
bun test tests/integration/t-plugin-stage-discovery-performance.integration.test.ts
bash tests/run-tests.sh --ci
```

TLCの実Docker受入は外部状態を変更するため、既存の承認済みworkflow_dispatch証拠を再利用する。再実行する場合は別途人間承認を得る。

## 測定方法

- plugin benchmarkはDarwin 25.5.0 / Apple M4 Max / Bun 1.3.13でwarm-up 2回後、baseline/treatmentを交互に各10回測定する。
- raw samples、中央値、追加率、fixture bytesを保存し、平均値だけで判定しない。
- 独立processを10回実行し、単一processのcacheやwarm stateによる偽greenを避ける。

## 合格条件

- plugin focused run追加率5.3517%、独立process worst 18.1337%で20%以下。
- 1,000 stage capacity最大7.3796msで10,000ms未満。
- TLC最終受入run `30078685585` は最大spawn 161,861.957ms、最大CLI 161,986.744ms、全6回NOT_DETECTED、container残留0。
