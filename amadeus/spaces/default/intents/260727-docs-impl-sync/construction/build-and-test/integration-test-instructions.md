# Integration Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

依拠箇所: code-summary.md「未完」節の未検証面(3 PR 相互のマージ順序交差)を統合検証の対象として引き継ぐ。

## 統合検証

1. 各 PR の GitHub CI「CI Success」green(PR 単位の統合ゲート)
2. マージ順序交差: 各 PR マージ後に残 PR を update-branch し CI 再 green を確認(マージは人間承認後 — no-AI-merge)
3. マージ完了後、main 断面で受け入れ基準 grep を再実測し乖離目録の最終閉包を確認

## 対象外(N/A)

- サービス間統合・E2E: 稼働サービスなし(docs のみ)
