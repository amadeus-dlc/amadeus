# Performanceテスト手順 — Pi adapter

## 根拠と測定契約

`pi-lifecycle-gate-adapter`の`code-generation-plan.md`と`code-summary.md`、NFR-PERF-001に従う。model call、network、filesystem I/Oを除外し、同じhuman-input正規化fixtureでKimi adapterを固定baseline、Pi adapterをtreatmentとする。

## 実行コマンド

```bash
bun test tests/perf/t-pi-adapter-overhead.test.ts
```

同一processで各adapterを10回warm-up後、Kimi→Piの順で100回交互測定し、それぞれのmedian wall timeを算出する。

## 合格基準と回帰判定

`median(Pi) <= max(2 * median(Kimi), median(Kimi) + 100ms)`を満たすこと。測定回数、両median、limitをJSONで出力する。外部I/Oを含む測定、異なるhost間の比較、平均値だけの比較は正式証拠にしない。
