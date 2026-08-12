# 性能テスト手順 — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) の `FR-7` に従い、性能閾値と負荷吸収用 timeout budget を分離して検証する。

## 実行方法

```sh
TEST_TIME_FACTOR=1 bun test tests/unit/t07-hook-audit-logger.serial.test.ts
TEST_TIME_FACTOR=2 bun test tests/unit/t07-hook-audit-logger.serial.test.ts
TEST_TIME_FACTOR=2 bun test tests/unit/t-test-time-factor-consumers.test.ts
```

専用のHTTPサービスや負荷生成器は存在しないため、RPS/latency のロードテストは適用外である。

## 判定基準

- wall-clock 性能閾値は係数 `1` と `2` で同じ値を使用する。
- timeout、poll、settle のテスト用予算だけが同率で増える。
- 性能境界の失敗は係数で隠さず、無競合隔離でも再現する場合に性能退行として扱う。

## テストデータ

- repository 内の決定的 fixture と一時 workspace のみを使用し、本番データは使用しない。
