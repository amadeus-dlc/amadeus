# Performance Test Instructions — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

## 方針(比例選定)

専用の性能試験機構は追加しない(build-and-test:c1/c3 — 承認済み NFR への比例選定)。P-1/P-2 は強制メカニズムと構造で担保する:

- P-1(単発検査の軽さ): manifest `timeout_seconds: 5` — dispatcher の既存 timeout 機構が強制。検査は I/O 1回(readFileSync)+O(行数)走査のみ(ループ・再帰・spawn なし)
- P-2(発火面の限定): manifest `matches: **/*-questions.md`(狭 glob)— questions 書込み時のみ script spawn

## 検証方法

```bash
grep -E "timeout_seconds|matches" packages/framework/core/sensors/amadeus-answer-evidence.md
bun test tests/integration/t-answer-evidence-sensor.test.ts   # 20件 40ms 級で完走(実測 39ms)
```

## リグレッション検知

テストランナー予算(tests/run-tests.sh の既存 timeout 規律)内での完走を CI が常時検査 — 専用ベンチは持たない。
