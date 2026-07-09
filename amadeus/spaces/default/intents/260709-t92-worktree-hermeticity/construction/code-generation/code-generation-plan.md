# Code Generation Plan — t92-worktree-hermeticity

単一バグ(#709)の単一ユニット構成。単独 intent の例外根拠(選挙 A8=A、5:0): 束ね相手不在 + bug-zero ゴール + 空き容量。

## ユニット構成

| unit | 対象 | 修正面 | テスト面 |
|---|---|---|---|
| u709-t92-skip-guard | Issue #709 / FR-709(選挙 Q1=A) | `tests/integration/t92.test.ts` test 44 に in-file の skip-with-reason ガード(リポジトリ root の `node_modules/.bin/tsc` 解決可否)を追加。本番センサーは不変 | 落ちる実証: 未 install 相当条件で修正前 test 44 が赤 → 修正後 skip(理由付き)。install 済みで test 44 実行+緑(誤 skip なしの実測) |

## 実装規律

- 隔離 worktree 内で `origin/main` からブランチ `fix/709-t92-worktree-skip-guard` を切る。
- 赤先行: 未 install worktree(detached worktree、bun install なし)で現行 t92 の赤(test 44 のみ fail)を実測記録 → ガード追加 → 同条件で skip-with-reason になり t92 全体 exit 0 を実測。install 済み環境で test 44 が「実行され」緑(skip されない)ことを実測。
- 検証: typecheck / lint / t92 単体 / フルスイート / dist:check / promote:self:check(全て exit 0)。
- 本番コード・tests/run-tests.ts・センサーへの変更禁止。修正は t92 テストファイル内に閉じる。

## レビュー

- reviewer: amadeus-architecture-reviewer-agent(max 2 iterations)→ PR → codex 直接レビュー依頼。
