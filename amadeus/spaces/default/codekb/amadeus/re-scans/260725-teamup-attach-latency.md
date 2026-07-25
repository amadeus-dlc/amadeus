# re-scan: 260725-teamup-attach-latency

上流入力（consumes 全数）: [Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、実 launch 実測ログ（2026-07-25、3人構成 `bench` インスタンス）、`packages/framework/core/tools/team-up.sh`、`tests/integration/t-team-up-watcher-arming.test.ts`、外部スキル `~/.agents/skills/agmsg/`（watch.sh / delivery.sh / spawn.sh / lib/actas-lock.sh / run/）、既存 codekb 9成果物。

## スキャン諸元

| 項目 | 値 | 取得方法 |
| --- | --- | --- |
| Base commit | `6d4df90566dcf7aa00980e5f9e85c831ca9108ba` | `re-scans/` の到達可能 observed のうち HEAD 祖先で距離最小 |
| Observed commit | `ec624022ff65cc8b3912001f768bd66ec41a0e39` | `git rev-parse HEAD` |
| 祖先性 | OK | `git merge-base --is-ancestor <base> HEAD` exit 0 |
| 距離 | 125 | `git rev-list --count <base>..HEAD` |
| 区間規模 | 1018 files changed, 274683 insertions(+), 4573 deletions(-) | `git diff --stat <base>..<observed>` |
| Scope | amadeus-bugfix / Depth Minimal / Test Strategy Minimal / Brownfield / 単一 repo | intent 設定 |
| 実行方式 | 差分リフレッシュ（フルスキャンなし） | `cid:reverse-engineering:c1` |

## 症状（実 launch 実測、2026-07-25、leader + engineer×2、隔離インスタンス `bench`）

```
T+200.85s  team-up.sh EXIT (rc=1)   ← ユーザーがアタッチ可能になる時点
armed になったメンバー: 0 / 3
ERROR: agmsg watcher never armed for: leader engineer-1 engineer-2 (after 1 re-send(s))
```

Claude Code は3プロセスとも正常起動し、`herdr agent list` 上 `agent_status: idle`。すなわち watcher の起動失敗ではなく、**検証側が観測できない信号を待っている**。

## 根本原因（本 scan で独立に裏取り）

actas / monitor モードの不一致により、待機対象の ready sentinel が構造的に生成されない。

1. `packages/framework/core/tools/team-up.sh:1151-1190` の `verify_watchers_armed` が `ready.<team>__<role>` sentinel の出現を待つ。呼び出しは `:1455-1457`、`mux_attach`（`:1460`）の直前で同期実行。
2. sentinel を書くのは `~/.agents/skills/agmsg/scripts/watch.sh:307`（verbatim: `    printf '%s\n' "$SESSION_ID" > "$_rp" 2>/dev/null || true`）。ガードは `:300` の `if [ -n "$ACTIVE_NAME" ]`。`ACTIVE_NAME` は `watch.sh:43` の第4位置引数（verbatim: `ACTIVE_NAME="${4:-}"`）。
3. `~/.agents/skills/agmsg/scripts/lib/actas-lock.sh:63` のコメントが所有関係を明示（verbatim: `# Readiness sentinel path for (team, agent). watch.sh creates this when an` / 次行 `# exclusive (actas) watcher attaches and removes it on exit, ...`）。
4. `team-up.sh:104` の初期プロンプトは `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"`。この経路が起動する watcher のコマンドラインは `~/.agents/skills/agmsg/scripts/delivery.sh:259 emit_monitor_directive()` の `:301`（verbatim: `  watch_command="$(printf '%q %q %q %q' "$watch" "$session_id" "$project" "$type")"`）— watch.sh へ渡る引数は 3 個で、`ACTIVE_NAME` は空。
5. よって monitor モードの watcher は sentinel を**一切書かない**。実測裏付け: `~/.agents/skills/agmsg/run/` は 251 エントリ（`ls -1 | wc -l`、読取 2026-07-25）だが `ready.*` は **0 件**（`ls -1 | grep -c '^ready\.'` = 0）。
6. `spawn.sh --wait-ready` が同じ sentinel で機能するのは `spawn.sh:358`（verbatim: `ACTAS_PROMPT="${CMD_PREFIX}${CMD_NAME} actas ${NAME}"`）で actas モード起動しているため。`team-up.sh` は `spawn.sh` を使わず「待つ側」だけを移植した。

## Architect による独立検証（合成段、2026-07-25）

Developer スキャンの追認ではなく、実ファイルを独立に開いて照合した結果（測定 ref: HEAD `ec624022ff65cc8b3912001f768bd66ec41a0e39`、agmsg 読取 2026-07-25）。

### 引用の再検証

上記の確約級引用はすべて実ファイル直読で一致を確認した（`team-up.sh` の `:1151` 定義 / `:1456` 呼出 / `:1460` `mux_attach` / `:104` / `:1282`、`watch.sh:43`、`actas-lock.sh:63` コメントと `:69` 定義、`delivery.sh:301`、`spawn.sh:358`）。数値も再実測で一致（`team-up.sh` 1474 行、`~/.agents/skills/agmsg/run/` 251 エントリ、`ready.*` 0 件）。

訂正 1 件: sentinel の書込行は「`watch.sh:300-310`」の範囲指定ではなく `:307` の単一行。ガード条件 `:300` と書込 `:307` を分離して記載した（`cid:requirements-analysis:verbatim-quote-with-cite`）。

### 列挙の完全性（`cid:requirements-analysis:enumeration-completeness-review`）

「monitor モードの watcher は sentinel を書かない」の反証を探すため、agmsg 全域で書き手候補を独立再列挙した。

| 検索 | 結果 |
| --- | --- |
| `grep -rn "agmsg_ready_path" ~/.agents/skills/agmsg/` | 3 hit — `lib/actas-lock.sh:69`（定義）、`spawn.sh:564`（読み手: :572 削除 / :578 待機）、`watch.sh:303`（唯一の書き手、書込 :308） |
| `grep -rnI "ready\." ~/.agents/skills/agmsg/`（`run/` 除外） | 2 hit — `lib/actas-lock.sh:72`（path 組立）、`session-start.sh:194`（削除側: 死 session の sentinel を `rm -f`） |

**反証なし**。書き手は `watch.sh` の actas ガード内 1 経路のみで、Developer の主張は成立する。

### 対称性レビュー（`cid:requirements-analysis:symmetric-pair-review`）

`clear_stale_watcher_sentinels`（消す側）と書く側の非対称に加え、**第2の片側実装**を検出した — `spawn.sh:565-568` は「readiness ハンドシェイクを持たない起動形態では待機自体を skip する」適用可否ガードを持つが、`team-up.sh:1077 watcher_verification_applies()` は runtime と backend しか見ず、起動経路が実際に sentinel を出すかを判定しない。詳細な対照表は `architecture.md` の同 intent 節に記載。team-up.sh 内の他の対（Codex safety-wait の start/stop、`trap handle_exit EXIT` / `trap - EXIT`）は対称で、片側実装は watcher 検証まわりに固有。

## 混入時点

| commit | 日付 | 内容 |
| --- | --- | --- |
| `42c9341d8` | 2026-07-23 | PR #1391「fix(team-up): verify claude watcher arming with resend before mux attach」— **混入**。当時のパスは `scripts/team-up.sh` |
| `70cc7c526` | — | 親。`git show 70cc7c526:scripts/team-up.sh` に `verify_watchers_armed` は 0 hit、`mux_attach` 前のブロッキング待機なし |
| `0d24c6f93` | 2026-07-23 | PR #1421。`packages/framework/core/tools/` へ昇格（ロジック不変） |
| `9b851c5ae` | 2026-07-24 | `WATCHER_RESEND_MAX` 2 → 1（270 秒 → 180 秒）。モード不一致は未修正 |

## テストの盲点

`tests/integration/t-team-up-watcher-arming.test.ts`（268 行）は agmsg をスタブ化し、sentinel をテスト自身が書いている（:42 path 関数スタブ、:87-91 `armAll` による事前配置、:60 `FAKE_RESEND_ARMS=1` 時のフェイク arming）。実際に sentinel を書く agmsg 側はテストに登場せず、本欠陥は導入以来 CI で常時グリーンだった。

## 副次的コスト

`create_run` の worktree 作成は直列（`team-up.sh:1282`、verbatim: `    git -C "$REPO" worktree add -q -b "$branch" "$wt" "$base_commit"`）。conductor 実測 1.153 / 1.068 / 1.013 秒（3回、測定 ref: HEAD `ec624022f`）。リポジトリ規模は tracked 11,051 ファイル（`git ls-files | wc -l`）、`.git` 166M（`du -sh .git`）— 本 scan で再実測。7人構成で約 7.4 秒。200 秒に対しては誤差だが、ブロッキング除去後は支配項になる。

## 原因の所在

**設計段階の誤り**（実装逸脱ではない）。`cid:application-design:external-seam-vocab-measurement` に該当 — 外部 seam の「存在の実測」は行われたが、「誰がどのモードで書くか」の実測を欠いたまま確約された。

## 関連 Issue

- [#1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — 本 intent の対象（起動レイテンシ解消）
- [#1476](https://github.com/amadeus-dlc/amadeus/issues/1476) — actas 移行による根治。本 intent のスコープ外

## センサー

RE ステージの宣言センサー3種（required-sections / upstream-coverage / answer-evidence）は codekb 出力パスが sensor filter に構造的に不適合で発火不能（`cid:reverse-engineering:re-sensors-codekb-filter-mismatch`、`cid:reverse-engineering:c3-codekb-sensor`）。**センサー成功として扱わない**。代替として次を直接検証した:

- H2 構成: 更新した9成果物すべてで `## ` 見出しが 2 個以上存在することを直読確認。
- 上流入力参照: 本ファイル冒頭の「上流入力（consumes 全数）」行に列挙し、本文中で実参照した（装飾トークンなし）。
- 確約級の file:line 引用はすべて起草時に実測し、verbatim 断片を併記した（`mechanism-cite-verify-at-draft` / `verbatim-quote-with-cite`）。

## 更新した成果物

1. `reverse-engineering-timestamp.md`（新 current 節 + 旧「現在: 260725-mirror-review-fixes」→履歴ラベル化）
2. `architecture.md`（actas/monitor モード不一致の機序、260724 節への訂正注記）
3. `code-quality-assessment.md`（常に失敗する検証ゲート、テストスタブによる検出不能性）
4. `code-structure.md`（HEAD 時点のコード配置と repo 内外の境界）
5. `component-inventory.md`（現行行番号でのコンポーネント登録、外部コンポーネント表）
6. `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`（「変更なし、確認済み」一行追記）
7. `re-scans/260725-teamup-attach-latency.md`（本ファイル、新規）

## Delivery boundary

codekb 成果物の更新のみ。実装・テスト・state・audit・生成配布物・commit・PR 操作は未実施。
