# セキュリティテスト指示

## 適用判定

`code-generation-plan.md` と `code-summary.md` を確認した結果、新しい認証・認可、外部入力、秘密情報、ネットワーク境界は追加されておらず、専用のセキュリティ NFR はない。専用の SAST・DAST 試験は非該当とする。

## 安全性の回帰確認

blocking sensor の script-error を成功扱いしないこと、および診断文字列に未加工入力を追加しないことは、対象 unit/integration 回帰で確認する。実行コマンドと結果は `unit-test-instructions.md`、`integration-test-instructions.md`、`build-test-results.md` に記録する。
