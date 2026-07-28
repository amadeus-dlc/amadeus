# Unit Test 手順 — Slop cleanup

上流入力: `code-generation-plan.md`、`code-summary.md`

## 対象と準備

既存の Bun test configuration をそのまま使用し、新規テストファイルや設定を追加しない。Unit test は Journal codec と audit seam の挙動非変更を検証する。

- `tests/unit/t352-journal-codec.pbt.test.ts`
- `tests/unit/t351-audit-record-seams.test.ts`

fixture は各テストが所有する既存データを使用し、外部サービスや手動セットアップを必要としない。今回のコメント変更には runtime 分岐がないため、coverage 数値の増加ではなく既存 property / boundary assertions の全成功を品質目標とする。

## 実行方法と成功条件

```bash
bun test \
  tests/unit/t352-journal-codec.pbt.test.ts \
  tests/unit/t351-audit-record-seams.test.ts
```

全テストが pass、fail が 0 であること。serialize / parse / identity、malformed input refusal、audit record seam の既存契約が維持されることを確認する。

## 失敗時の対応

最初の failing assertion を FR-1 のコメント変更または生成同期へ追跡する。runtime 行を変更して回避せず、コメント以外の差分が混入していないかを先に確認する。
