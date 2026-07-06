# unit-test instructions（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 適用判断

適用する。model overlay の決定論的検証は `dev-scripts/evals/model-overlay/check.ts`（eval 10 系列、37+ 検査）が単体検証に相当する。

## 手順

1. `npm run test:it:model-overlay`

## 検査対象（系列 ↔ 要求の対応）

| 系列 | 検査内容 | 要求 |
|---|---|---|
| (a) | --check が宣言未反映を非ゼロで検出 | NFR-1 |
| (b)(b regression) | 適用の冪等、bootstrap 時 base 記録（fallback 同値でも記録） | FR-2.1 |
| (c) | revert(apply(x)) == x の byte 一致 | FR-3.3 / BR-5 |
| (d) | 上流 drift 時の parity fail | FR-3.2 |
| (e) | bootstrap window の通常比較 + ヒント | FR-1.4 / BR-2 |
| (f) | fallback 適用と発動記録、--reason 必須 | FR-4.1/4.2 / BR-3 |
| (g) | doctor 乖離警告 / 不在時 no-op / 読み取り失敗時 1 行警告 | FR-4.3 / BR-7（gate 承認条件込み） |
| (h) | 管理外実値への apply 拒否 + base 不変 | BR-10 |
| (i) | 管理値集合に一致しない手編集値の parity fail | BR-9 |
| (j) | promote フックの redirect スキップ / drift 時 fail-soft | FR-2.2（gate 確定の再定義） |

## 期待結果

`model-overlay eval: ok`（全検査 pass、一時 workspace は try/finally で片付け）。
