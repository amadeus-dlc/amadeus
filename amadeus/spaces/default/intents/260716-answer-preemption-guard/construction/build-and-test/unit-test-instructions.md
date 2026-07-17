# Unit Test Instructions — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

## 対象とフレームワーク

- 対象: `evaluateAnswerEvidence` / `main`(amadeus-sensor-answer-evidence.ts、in-process seam)
- フレームワーク: bun test(既存ランナー tests/run-tests.sh の integration 層に配置 — 実 FS fixture を用いるため fs-tests-integration-first に従い unit 層へ置かない)

## 実行方法

```bash
bun test tests/integration/t-answer-evidence-sensor.test.ts
```

## カバレッジ目標(Comprehensive)

- 業務ルール R1〜R6 と 1:1 のケース+vacuity guard+決定性+cutoff 単一定義ピン = 20 テスト
- lcov: script 48/48 行(100%、DA:0 なし)。patch 追加行の未カバー 0(push 前実測済み)

## テストデータ

- fixture は一時ディレクトリへ実書込みした `*-questions.md`(実行時消費面への注入 — inject-runtime-consumed-lines)
- 様式: 裁定参照あり/なし記入・空欄・N.A.・単一括弧プレースホルダ・0問様式・ファイル不在・cutoff 前 intent dir 名
