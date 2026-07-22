# Unit Test Instructions — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）。Test Strategy は Comprehensive。

## 対象と実行

```sh
bun test \
  tests/unit/t-norm-metrics.test.ts \
  tests/unit/t238-election-record.test.ts
```

外部 setup と共有 mutable state は不要。fixture は各 test 内で構築し、production と同じ pure scanner/parser/validator を直接駆動する。

## Requirement 対応

- FR-1: canonical 非退行、sparse `cN/CN`、case-fold label 重複、bin範囲・昇順・重複、空segment、不正token、failure atomicity。
- FR-2: `GoaLineCode` の自然複節・旧圧縮形、lowercase・空節・先頭/末尾hyphen・非文字列拒否。
- FR-3: 旧/new E-code occurrence count不変、`E-SDE-CG4` 全長match、scanner valid-prefix と validator whole-value reject の所有境界。
- NFR: `N=1/2/4` で offsets 厳密単調、head/record比例、`execCalls=H+1`。

## 合否基準

全 test/assertion が passし、skip/fail 0。固定ミリ秒値や source-shape grep を性能合否に使わず、production同一loopの決定論的証拠をassertする。
