# Performance Test Instructions — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニットの code-generation-plan.md と code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 判定

専用性能テストは **N/A**(反証可能な根拠: 各ユニット nfr-requirements が SLO 非設定を確定 — 対象は数十票規模の単発 CLI で、常駐サービス・スループット要求が存在しない。requirements.md に性能 FR なし、各 code-summary.md の検証列にも性能項目なし)

## 代替検証

- 決定性(NFR-3)が性能系の唯一の検証対象: BR-10/BR-R5 の同一入力 deep-equal(unit 層に内包)
- 停止性: 既存テストランナーのタイムアウト(team-practices.md の CI gate)が上限ガード

(検証対象の実装スコープは各ユニット code-generation-plan.md の Bolt 分割宣言に従う)
