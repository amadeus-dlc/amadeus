# Code Generation Plan — fix-1773-ballot-blind-storage

上流入力(consumes 全数): requirements.md — FR-1(#1773、裁定 Q1=A = 格納分離)を実装対象とし、受け入れ基準1〜4をテスト計画の導出元とした。

## 計画(実施順)

FR-1 を、既存の `Store` API 境界を保ったまま「格納の分離・意味論の非分離」で実装する。

1. ブランチ `bolt/fix-1773-ballot-blind-storage` を worktree 隔離で作成。
2. 実装前 RE: `amadeus-election-store.ts` の appendBallot / ledger / materialize / status / late lane、`amadeus-election.ts` の tally 読み手、既存テスト(t234/t235/t236 系)を実読。並行 Bolt との交差回避のため `amadeus-election-model.ts` と t234 の view 系 assert には触れない制約を維持。
3. **Red**(TDD): 新規 `tests/integration/t373-election-ballot-blind-storage.integration.test.ts` で AC-1(collecting 中の `ledger.json` に票本文なし)・AC-2(`git check-ignore` 実測)・AC-4(late/amend 意味論)を先に固定 → exit 1 実測。
4. **Green**: (1) 選挙ディレクトリ配下に gitignored な `pending/<voter>.json` を新設し tally 前の受理票をそこへ書く (2) `Store.ledger` を「統合済み台帳+未統合 pending」のマージビュー(単一の読み取り口)にし、status/tally/verify/重複判定/amend ref 解決を全てこの口に通す(FR-1c) (3) tally 遷移(`Store.materialize`)で pending を到着順に統合し drain(FR-1b)。統合の同一性は内容(`ballotKey` = voter/kind/submittedAt)で定義し、drain 失敗・再 tally でも二重計上しない (4) `.gitignore`+7ハーネス `dot-gitignore` へパターン追加。timeline 不変(FR-1d)。
5. 同根棚卸し(共有可変ファイル経由の設計外チャネル)→ `ledger.json` の1箇所のみと確定。
6. 配布同期 → 検証(typecheck/lint/dist:check/promote:self:check/complexity/coverage registry/patch gate/対象・隣接スイート)→ allowlist 行ピン機械 remap+直読照合 → deslop → コミット → push → PR #1808。
7. CI patch gate の未カバー1行(:153)を自己捕捉し lcov DA 実測で到達を固定して是正。レビュー bot 指摘3件へ実質是正(統合の内容ベース化・pending 行の形状検証 `isPendingEntry`・事後状態 assert 追加)+1件を根拠付き却下、収束ループを CI 全 green まで完走。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T02:59:52Z
- **Iteration:** 1
- **Scope decision:** none

PR #1808 は FR-1a〜1d を忠実に実装しており、surgical・CI 全緑・申告済み2判断(t236 移設 / model-map 再ピン)はいずれも妥当。

### Findings

- None
