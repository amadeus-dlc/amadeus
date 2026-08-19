# Build Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md(検証コマンド集合 BR-6 の導出元)、code-summary.md(配送断面 = 検証対象の PR/ブランチ)

## ビルド対象

本 intent は docs-only(scope `self-document`、declare-docs-only 宣言済み)であり、アプリケーションのビルド成果物は生成しない。ただし docs 消費ガードの一部(t68 / t132 / t48 / t52)は self-install / dist 面を読むため、検証前に配布ツリーの生成が必要。

## 手順

1. 検証断面の checkout: `git switch -c <verify-branch> origin/bolt/docs-sync-freeze-parity`(全 4 Bolt を含む配送先端)
2. `bun run typecheck`(exit 0 を確認)
3. `bun run lint`(exit 0 を確認)
4. `bun run build`(dist/ とセルフインストール面の再生成 — 未追跡ローカル出力のみ。追跡ファイル不変を `git status` で確認)

docs-only PR は CI の `changes` job によりテスト層が skip されるため(G-1、#2278)、上記および各 test instructions のローカル実行を検証の正とする(BR-6)。
