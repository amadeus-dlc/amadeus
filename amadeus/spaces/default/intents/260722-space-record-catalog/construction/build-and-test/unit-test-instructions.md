# Unit Test Instructions

## 上流入力と対象

`code-generation-plan.md` と `code-summary.md` に記録された elections registry drift の表示・行検証契約を対象とする。

## 実行方法

```bash
bun test tests/unit/t261-elections-drift-label.test.ts
```

## 期待結果

- absent、corrupt、readdir-fail、no-drift、双方向 drift を網羅する
- registry row と directory の一致が完全一致である
- 大量 drift を黙って切り詰めない
- すべて pass、fail 0

## テストデータ

テスト内の純粋な fixture を使う。外部サービス、共有状態、実行順序への依存はない。
