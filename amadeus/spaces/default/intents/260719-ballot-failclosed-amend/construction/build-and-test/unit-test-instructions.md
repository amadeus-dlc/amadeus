# Unit Test Instructions — 260719-ballot-failclosed-amend

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行

```
bun test tests/unit/t234-election-model.test.ts
```

追加ケース(code-generation-plan.md のテスト計画表どおり): invalid-timestamp 6ケース+分類順序決定性 / kind・ref parse(欠落=original、amend 正常、ref 不正=parse-failure)/ resolveBallots 4ケース(最新・同時刻 amend 優先・複数 voter・冪等)/ classifyLate 非解決(R-4)。

## 実測記録

builder: 22 pass 0 fail(Phase B 統合後、#1261 choice 系との union)。純関数のみ・実 FS なし(層分離維持)。
