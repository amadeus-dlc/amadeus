# Performance Test Instructions — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-summary.md` — FR-3（`mux_attach` までの経路に `WATCHER_READY_TIMEOUT` 由来の `sleep` を残さない）と FR-4（既定構成で exit 0）の充足根拠を引き、性能検証の対象を「アタッチ到達時間」に確定した。
- `code-generation-plan.md` — 変更が `watcher_verification_applies` に限定されることを引き、他経路の性能退行リスクがないことを確認した。

## 対象と根拠

本 intent は性能欠陥（起動レイテンシ）の修正そのものであるため、性能検証は**任意ではなく主検証**である。ただし `cid:build-and-test:wtfbt-c3` に従い、実時間待機の重い自動テストは追加せず、要件充足は決定的な単体検証（t294 の適用可否判定）で固定し、**効果の実証は conductor による実 launch 計測**で行う。

## 実測（実 launch、隔離インスタンス、3人構成 leader + engineer×2）

| | 修正前 | 修正後 |
| --- | --- | --- |
| アタッチ到達までの時間 | **200.85 秒** | **5.87 秒** |
| 終了コード | 1（`agmsg watcher never armed`） | 0 |
| armed になったメンバー | 0 / 3 | 該当なし（検証をスキップ） |

- 修正前計測: 2026-07-25、instance `bench`、既定値 `WATCHER_READY_TIMEOUT=90` / `WATCHER_RESEND_MAX=1`
- 修正後計測: 2026-07-25、instance `bench2`、同構成、`.claude/tools/team-up.sh`（self-install 面）経由
- 両計測とも worktree・ブランチ・herdr セッション・agmsg team 登録を撤去済み（`git worktree list` が計測前後とも 31件で一致）

**約 97% の短縮**（200.85 → 5.87 秒）。残余 5.87 秒の支配項は `create_run` の `git worktree add` 直列実行（実測 1.05 秒/個）であり、Q2 裁定 A により本 intent のスコープ外（別 Issue へ分離）。

## 自動テストで固定した性能契約

t294 は「既定構成で `watcher_verification_applies` が偽を返す」ことを決定的に検証する。これが真である限り `verify_watchers_armed` は呼ばれず、`WATCHER_READY_TIMEOUT` 由来の待機は発生しない（FR-3）。実時間 90 秒を待つ統合テストは追加しない。

## CI 実行時間への影響

t294 は 194ms（`bun test` 実測）。`--ci` 全体は wall-clock drift 1件を報告したが、対象は `tests/integration/t-codex-hooks-migration.test.ts`（35.02s、declared=medium / measured=large）で、本コミットが触れていないファイル（最終変更は #1212 の `bf84cdfaf`）。本変更とは無関係な既存条件であり、`RESULT: PASS`。
