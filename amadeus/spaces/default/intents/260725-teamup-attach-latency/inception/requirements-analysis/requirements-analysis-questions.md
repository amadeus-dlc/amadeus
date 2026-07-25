# Requirements Analysis — Questions (260725-teamup-attach-latency / Issue #1449)

上流入力（consumes 全数）: `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`

- `architecture.md` — Q1 の選択肢に載せた actas/monitor モード不一致の機序、`verify_watchers_armed` の `mux_attach` 直前という位置、agmsg `spawn.sh` との構成要素対照表（生産側 `:358` と適用可否ガード `:565-568` の未移植）は本成果物から引いた。選択肢 A はこの対照表が示す未移植ガードの移植案である。
- `code-structure.md` — repo 内正本（`packages/framework/core/tools/team-up.sh`）と repo 外（`~/.agents/skills/agmsg/`）の境界を引き、Q1 の各選択肢が触る面（正本のみ / 正本+テスト / 配布物）を確定した。
- `business-overview.md` — Team Mode の利用者価値が「複数エージェントへアタッチして作業を開始できること」である点を引き、Q2 で worktree 並列化を分離しても本 intent の価値（アタッチ到達時間の解消）が独立して成立することを確認した。

## E-OC1 選挙不要判定

判定: **選挙不要（ソロモード）**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード（team.md § Operating Modes）。ソロモードではエージェント選挙・定足数・クロスレビューの規則を適用せず、未決の設計判断はユーザーへエスカレーションして裁定を得る。

leader 承認: 2026-07-25T08:52Z — 本 intent はユーザー自身が conductor へ直接指示しており、下記 Q1/Q2 はいずれもユーザーの直接裁定（AskUserQuestion 経由）で確定した。ソロモードにつき leader/member の分離はなく、承認主体はユーザー本人である。

---

## Q1: verify_watchers_armed のブロッキングをどの方式で取り除くか

reverse-engineering の実測により、`verify_watchers_armed` は**成功しうる条件が存在しないゲート**であることが確定している。

- 待機対象の sentinel `ready.<team>__<role>` を書くのは `~/.agents/skills/agmsg/scripts/watch.sh:307`（verbatim: `    printf '%s\n' "$SESSION_ID" > "$_rp" 2>/dev/null || true`）のみ。ガードは `:300` の `if [ -n "$ACTIVE_NAME" ]`、`ACTIVE_NAME` は `watch.sh:43` の第4位置引数（verbatim: `ACTIVE_NAME="${4:-}"`）。
- `team-up.sh:104` の初期プロンプトは `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"`。この経路が起動する watcher のコマンドラインは `~/.agents/skills/agmsg/scripts/delivery.sh:301`（verbatim: `  watch_command="$(printf '%q %q %q %q' "$watch" "$session_id" "$project" "$type")"`）で、`watch.sh` へ渡る位置引数は3個。第4引数は空。
- sentinel 書き手の全数 = 1（Architect が `agmsg_ready_path` 全参照と `ready.` 全出現の独立再列挙で確認。反証なし）。
- 実測: `~/.agents/skills/agmsg/run/` 251エントリ中 `ready.*` は 0件。実 launch（3人構成）で armed 0/3、200.85秒でタイムアウト exit 1。

- A. `watcher_verification_applies()` へ適用可否ガードを移植する。agmsg `spawn.sh:565-568` と同型（readiness ハンドシェイクを持たない起動形態では待機自体をスキップし、理由を stderr へ出す）。monitor モードではスキップ、actas プロンプトへ移行したら自動的に再有効化。
- B. 検証コード一式（約120行）と関連テストを完全削除する。
- C. `verify_watchers_armed` の呼び出しを `mux_attach` の後ろへ移す。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25、ソロモードにつき選挙なし）。`watcher_verification_applies()` に「起動プロンプトが actas watcher を arm する場合のみ検証する」条件を追加し、monitor モードでは理由を stderr へ出してスキップする。採用理由: (1) agmsg `spawn.sh:565-568` が持つ既存パターンの移植であり新規機構を発明しない (2) 「検証しない」ことと「なぜ検証しないか」を同時に表明するため no-silent-success を満たす (3) #1476 で初期プロンプトを actas へ移行した時点でガードが自動的に再有効化され、検証ロジックの再実装が不要 (4) B は #1476 での再実装コストを生み、C は無意味な180秒の背後実行と常時 exit 1 を残す。

---

## Q2: create_run の worktree 並列化を本 intent に含めるか

`create_run` の `git worktree add` は直列実行（`team-up.sh:1282`、verbatim: `    git -C "$REPO" worktree add -q -b "$branch" "$wt" "$base_commit"`）。conductor 実測 1.153 / 1.068 / 1.013 秒（3回、測定 ref: HEAD `ec624022f`）。7人構成で約7.4秒。Q1 の修正後は起動時間の支配項になる。

- A. 含めない。本 intent は 200秒 → 約8秒 の解消に集中し、並列化は別 Issue へ分離する。
- B. 含める。約8秒 → 約1〜2秒 まで短縮する。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25、ソロモードにつき選挙なし）。並列 `git worktree add` は `.git` の設定ロック競合の安全性検証が別途必要であり、本 intent のスコープ（起動レイテンシの構造的浪費の解消）とは変更の性質が異なるため分離する。
