# Integration Test Instructions

Unit: no-stub-lint（Test Strategy: Minimal）

## 対象

```sh
npm run lint:check      # 3 rule（既存 2 + no-stub-compat）の実ツリー一括検査
npm run test:it:lints   # 既存 lints ハーネス assert の回帰なし
npm run test:all        # repo 標準検証（test:it:no-stub-compat の連鎖組み込みを含む）
```

## 観点

- 新 rule が lints/check.ts の自動 discovery に乗り、lint:check → test:ci:mock → CI の検出ゲートに入ること。
- 既存 2 rule の挙動・eval が不変であること。
- backward-compatibility.md の新設表が既存節・既存コンシューマ（validator の部分文字列検査）に影響しないこと（reviewer が実装確認済み）。

## 結果

すべて pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
