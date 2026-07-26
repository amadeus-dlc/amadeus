# Unit Test Instructions — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

code-summary.md が記録する変更面のうち unit 層:

- `tests/unit/t-solo-standing-grant-domain.test.ts` — 捏造 fixture 是正後の domain 検証(実構造準拠)

## 実行

```
bun test tests/unit/t-solo-standing-grant-domain.test.ts
```

## 判定基準

0 fail。fixture が実 stage-graph の stock 語彙構造を写していること(scopes に composed 語彙を捏造しない)。
