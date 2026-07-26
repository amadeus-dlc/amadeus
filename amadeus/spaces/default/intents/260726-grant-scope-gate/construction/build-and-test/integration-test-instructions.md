# Integration Test Instructions — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象(regression + parity)

- `tests/integration/t-standing-grant-composed-scope.test.ts`(新規 17 テスト)— FR-1a-d / FR-2a-c / FR-5 / NFR-2 の受け入れ基準。実 stage-graph + 実 scope-grid(.codex/tools/data/ 配布面)を読む
- `tests/integration/t-standing-grant.test.ts` — stock スコープの既存分類(parity)+ team-mode 経路
- `tests/integration/t-solo-standing-grant-domain.test.ts` / `t-solo-gate-transaction-seam.test.ts` — solo 経路の directive contract / transaction 不変量(fixture 是正後)

## 実行

```
bun test tests/integration/t-standing-grant-composed-scope.test.ts tests/integration/t-standing-grant.test.ts tests/integration/t-solo-standing-grant-domain.test.ts tests/unit/t-solo-standing-grant-domain.test.ts tests/integration/t-solo-gate-transaction-seam.test.ts
```

## 判定基準

5 ファイル全数実行(`Ran ... across 5 files` と宣言数の照合必須)・0 fail。
