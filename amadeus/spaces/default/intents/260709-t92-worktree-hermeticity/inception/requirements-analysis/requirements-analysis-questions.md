# Requirements Analysis — 明確化質問(t92-worktree-hermeticity)

> 回答方式: エージェント間選挙。判断材料は #709 クロスレビュー2件(独立実測)と RE スキャン(tsc 解決チェーンの file:line、修正境界 = test 44 単独の実測判定)。既決照合: 本番センサー不変(#657/#679 で設計確定)・テスト専用分岐の本番混入禁止・落ちる実証は memory 層で既決のため質問しない。真に未決は修正方式の1問のみ。

## Q1. #709 修正方式 — test 44 の worktree ヘルメチシティをどう確保するか

前提事実(RE 実測): test 44 は pinned tsc(typescript ^6)の exit-2 分類の検出器(#657 リグレッション監視)。未 install worktree では symlink 先が欠落し bunx フォールバックの別 TS が exit-1 を返して偽赤。

- A. **skip-with-reason ガード**: test 44 に in-file の実行前提検査(`REPO_ROOT/node_modules/.bin/tsc` が解決可能か)を付け、解決不能なら理由付き skip(t-tui 系の `test.skipIf` と同型の先例)。install 済み環境では従来どおり厳密ピンを実行(検出力無退行)。差分最小
- B. **fixture 自己完結化**: test 44 が自前で pinned TS を fixture に導入(bun install / 明示コピー)して環境非依存に。skip ゼロだがテスト実行コスト増・ネットワーク/キャッシュ前提が新たに入る(別の非ヘルメチシティ)
- C. **アサーション緩和**: exit-2 ピンを「非0の script-error 分類」へ広げ環境差を吸収。skip も導入コストもないが、#657 リグレッションの検出力が下がる(ゲート緩和 — 検証劇場 Forbidden に接近)
- X. Other

[Answer]: A — 4票確定(2026-07-09 選挙)。skip-with-reason ガード方式。requirements FR-709 に反映済み。
