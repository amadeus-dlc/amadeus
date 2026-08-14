# 性能テスト指示

## 適用判定

`code-generation-plan.md` と `code-summary.md` を確認した結果、今回の変更は blocking sensor の既存エラー判定を fail-closed にする分岐修正であり、新しい性能 NFR や負荷要件はない。専用の性能試験は非該当とする。

## 退行確認

通常の `bun run test:ci` に含まれる既存性能閾値テストを回帰監視として用いる。今回差分のない `t07-hook-audit-logger.serial.test.ts` の固定時間閾値超過は実行環境制約として `build-test-results.md` に分離記録し、今回の機能判定には使用しない。
