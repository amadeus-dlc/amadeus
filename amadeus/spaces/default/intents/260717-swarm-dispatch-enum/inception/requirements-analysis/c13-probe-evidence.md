# C-13/C-14 Probe Evidence — Codex native subagent の prepared unit worktree 隔離書き込み

出典: probe 実施者(codex セッション)からの agmsg 報告 2026-07-17T23:47:33Z+追補 23:47:56Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示。probe の child commit 4bf5487c2 は branch 削除後 dangling のため git からは到達不能で、本ファイルが record 上の evidence 正本)。手順書 = 本ディレクトリ `c13-probe-procedure.md`(commit 7762af613)。

## 判定: 成立(条件付き開示 2 点)

- **C-13(隔離書き込み)**: 成立。Codex native child は prepared unit worktree(`.amadeus/worktrees/bolt-probe-c13`)内の相対パス `probe-c13-evidence.txt` のみを作成し、`git add` / `git commit`(4bf5487c2)まで exit 0 で完了。child 実行直前と直後で本線の `git status --porcelain`・HEAD(e9a001105)・`git diff --binary` の SHA-1・共有 stash・probe 以外の worktree 一覧が完全一致(status_equal / head_equal / diff_hash_equal / stash_equal / worktrees_equal = すべて true)。
- **C-14(writable-root 境界)**: sandbox 拒否なし(全操作 exit 0)。**開示1**: 実測時の sandbox 表示は permission profile `disabled` / filesystem `unrestricted` — 制限プロファイル下の挙動は未実測であり、本 evidence は「現行のユーザー実行構成で成立」を示す(restricted profile での成立を主張しない)。
- **effort**: `ultra`(ユーザー設定)の受理を確認。**開示2**: 実適用 telemetry は未観測 — C-15 の証拠限界(受理+child 完了まで)と整合。

## 実行環境(報告 verbatim)

- 日付: 2026-07-18(Asia/Tokyo)/ Codex: `codex-cli 0.144.5`(C-20 充足)
- 本線開始 HEAD: `e9a001105d253e14affb77417423d9f0b0360f9e`
- prepared worktree: `.amadeus/worktrees/bolt-probe-c13` / branch: `bolt-probe-c13` / child commit: `4bf5487c247d5fbd04aeacf0613d1098c1880698`

## 実測要点(報告からの転記)

1. `prepare --batch 99 --units probe-c13` は初回 `--base main` で stale 検出により exit 2(local main が origin/main と乖離)→ 本線を動かさない規律を守り、同一 SHA の一時 ref `codex/probe-c13-base` で再試行し exit 0。fork 元 bytes は同一
2. child は worktree 内で `pwd` / `git rev-parse --show-toplevel` が worktree パスに一致、`probe-c13-evidence.txt`(1行)を作成・コミット
3. 隔離比較: 本線 status/HEAD/diff-hash/stash/他 worktree すべて前後一致。並行稼働中の leader worktree の HEAD 前進のみが全区間比較の差で、child 実行区間内では差ゼロ
4. cleanup: `finalize` 不実行(手順書どおり)。worktree remove --force / branch -D 2件、削除後の不在を `git show-ref --verify` で確認 exit 0
5. 既知の deterministic side effect: prepare は実施クローンの active intent(260717-mirror-issue-tool)の state/audit を更新(158 insertions/1 deletion — SWARM_STARTED / Bolt state)。child 書き込みとは分離して基準化済み。audit は probe 前から未コミット変更を含むため実施者側で巻き戻さず現状維持(追補報告)

## Requirements への反映

- FR-5(Codex floor)の hard stop を解除 — C-13/C-14 成立
- 開示1(sandbox unrestricted 条件)と開示2(effort telemetry 不在)を requirements の前提・NFR-2 に転記
