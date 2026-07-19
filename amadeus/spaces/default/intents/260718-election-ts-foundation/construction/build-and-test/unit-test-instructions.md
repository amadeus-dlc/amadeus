# Unit Test Instructions — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニット code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 対象と実行

unit 層は fs 非依存の純関数検査(bolt-plan.md の層宣言 — 各ユニット code-summary.md のテスト列):

```
bun test tests/unit/t234-election-model.test.ts      # U1: parse 5クラス・tally 決定表・シャッフル決定性・境界
bun test tests/unit/t238-election-record.test.ts     # U3: 実 parseGoaLine round-trip・verify 3クラス・落ちる実証
bun test tests/unit/t239-election-transport.test.ts  # U4: 型面 blind・brand 構築不能・normalizeAt 契約
```

## 合格基準

全 pass(0 fail)。requirements.md FR-3b/FR-4/FR-5a の受け入れテストを内包(落ちる実証は各ファイル内の注入ケース)
