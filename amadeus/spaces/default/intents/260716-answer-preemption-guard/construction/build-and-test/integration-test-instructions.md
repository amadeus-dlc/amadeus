# Integration Test Instructions — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

## 対象とフレームワーク

- dispatcher 経由の実配線: manifest 解決(t89)・sensor list ロスター(t93)・designer-export golden(t66)
- E2E 検分は配布コピー `.claude/tools/` 経由で実施(no-canonical-direct-execution)

## 実行方法

```bash
bun test tests/integration/t89.test.ts     # compile: 29 stage 解決+初期化3の空維持(Case 7/8)
bun test tests/integration/t93.test.ts     # sensor list 5本ロスター
bun test tests/integration/t66.test.ts     # designer-export golden
bash tests/run-tests.sh --ci               # フルスイート(smoke/unit/integration)
```

## 境界ケース(落ちる実証込み)

- 赤側: dist の failed() 反転注入 → 5テスト赤 → package.ts 再生成で復元(code-generation で実測済み、注入は head 非残存 — falling-proof-injection-one-set)
- 白側: R2 pass 4 reason+skip 2形(pre-cutoff / not-questions)をテスト内 fixture で恒久化
- 語彙衝突: 定型ヘッダ「E-OC1」のみの入力で検査が空文化しない(vacuity guard)

## テストデータ

t89 fixture: tests/fixtures/v05-mr7b-sensor-resolution/(full 5 dir に amadeus-answer-evidence.md 伝播済み)
