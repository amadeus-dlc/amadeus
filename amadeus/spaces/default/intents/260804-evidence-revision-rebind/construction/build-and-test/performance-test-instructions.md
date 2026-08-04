# Performance Test 手順

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 適用判断

`code-generation-plan.md` の NFR-4 対応と `code-summary.md` の workflow 実装を確認した。承認済み要件には throughput、latency、load、resource 使用量の数値目標がなく、常駐 service も存在しない。このため、独立した負荷試験や benchmark を合格条件として追加しない。

性能に関係する実在契約は、workflow の有限 timeout、安定 concurrency、PR critical path 非延長、通常 runner の完走性である。これらは workflow contract test と full suite の実行で確認する。

## 実行コマンド

```sh
bun test --timeout 120000 tests/integration/t427-no-silent-drop-evidence-workflow.integration.test.ts
bun run coverage:ci
```

## 合格条件

- workflow が有限 `timeout-minutes` と固定 concurrency key を持ち、PR workflow や `CI Success` の `needs` に結合されていない。
- full suite が runner の既定 timeout 契約内で完走する。
- 実行時間は診断証拠として記録するが、承認済み閾値がないため新しい数値ゲートへ昇格させない。
