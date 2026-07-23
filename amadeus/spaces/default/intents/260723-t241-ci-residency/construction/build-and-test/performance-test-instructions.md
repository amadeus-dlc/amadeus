# Performance Test Instructions — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## 選定判断: 専用性能テストは追加しない(N/A)

cid:build-and-test:c1(performance は承認済み NFR と実在境界へ trace して選定)に従う。本 intent の性能面 NFR は NFR-4(CI 予算)のみで、計測は「PR CI 実行時間の増分が +60 秒超なら申告」という申告閾値 — 専用テストでなく CI 実測で充足する。

## NFR-4 実測

PR #1401 の typecheck-lint-drift-tests ジョブ実測 = **4m37s**(基準 = PR #1391 の 4m25s、増分 +12s < +60s 申告閾値)→ 申告不要域。t241 の integration 層追加は spawn 数秒オーダーで CI 予算に有意な影響なし。
