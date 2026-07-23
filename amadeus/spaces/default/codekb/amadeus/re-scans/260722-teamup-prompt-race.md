# re-scan 記録 — 260722-teamup-prompt-race

## 実行メタデータ

- Date: 2026-07-22T22:03:26Z（scan-notes 実行時刻の転記）
- Intent: `260722-teamup-prompt-race`（[Issue #1384](https://github.com/amadeus-dlc/amadeus/issues/1384) — `scripts/team-up.sh` の fresh セッションで初期プロンプト `/agmsg mode monitor` が Claude Code TUI 起動レースで消失し watcher が起動しない。再現率 5/6）
- Scope: `bugfix`（Depth Minimal）
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: differential refresh（cid:reverse-engineering:c1、E-L63 の base 選定則）。base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`（現 HEAD 実測 `git rev-parse HEAD`）、`git merge-base --is-ancestor base HEAD` exit 0、distance `git rev-list --count base..HEAD`=101。日付がより新しい非祖先 observed（`545e69c8` 等）は `--is-ancestor` exit 1 で除外済み（cid:reverse-engineering:rescan-base-ancestry）。Developer スキャン→Architect 合成の直列（cid:reverse-engineering:c3）。
- 測定 ref: 全 file:line は Observed=HEAD `a81c11dde` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill（`~/.agents/skills/agmsg/scripts/`）直読（cid:measurement-ref-in-artifacts）。区間件数はコマンド出力からの転記（numbers-from-command-output-only）。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。

## diff 規模（機械集計、ref = base..HEAD）

- `git diff --shortstat a326f47..HEAD`: `2593 files changed, 349417 insertions(+), 5289 deletions(-)`（scan-notes 転記）。
- ディレクトリ別上位: `amadeus/spaces` 2020（RE codekb・intent record の記録面が大半）、`tests/integration` 55 / `tests/unit` 47 / `packages/framework` 44、`scripts/formal-verif` 36 / `tests/formal-verif` 16（別 intent 260720-formal-verif-experiment の新規大型領域、本バグと無交差）。
- 俯瞰: 差分 2593 ファイルのうちアプリ実コードの本バグ交差面は `scripts/team-up.sh`（+212 −8）と付随テストのみ。

## 現行結論（根本原因）

**確定した機構（静的読解）**: `scripts/team-up.sh` の claude member 起動経路は、初期プロンプト `/agmsg mode monitor` を **一発勝負** で渡し、TUI 起動レースで取りこぼされても再送・検証が一切ない。

- `:800` `claude_member_cmd()` が `init_prompt="/agmsg mode monitor"` を固定（verbatim 断片: `local m="$1" wt="${2:-$BASE/$1}" args="" init_prompt="/agmsg mode monitor" interaction_args=""`）。
- `:830-832` の起動コマンド組立は `%q`（`$init_prompt`）で quoting 正常、`run-claude.sh` の末尾 argv として渡る。`run-claude.sh` 末尾は `exec claude --dangerously-skip-permissions "$@"` → init_prompt は claude CLI の位置引数（初期プロンプト）として **一度だけ** 渡る。
- pane 起動 `:429`（`mux_new_session`）/ `:447`（`mux_split`）は `"$HERDR" --session "$s" pane run "$pane" "$cmd"` で cmd を一度 exec するのみ。claude が初期プロンプトを受理したか / watcher が attach したかの検証はない。
- **readiness 検証の構造的不在**: `start_safety_wait_supervisors()`（`:338-395`）は `:340` `[ "$RUNTIME" = "codex" ] || return 0`（verbatim）で claude では即 return。claude runtime には起動後の readiness 検証が存在しない。

**原因の所在（cid:bug-intent-linkage）**: claude watcher-arming 経路は当初から「初期プロンプト一発・検証なし」の設計で、直近 intent `260721-teamup-safety-wait` が起動後の pane readiness 検証（safety-wait supervisor）を **Codex 専用** に新設したものの、claude 経路へ一般化しなかった。原因所在は **設計（一般化漏れ）** — Codex 版検証機構が既に team-up.sh 内に実在するのに、同型の readiness 契約が claude の init_prompt/watcher 起動に及んでいない。

## 対照実装（agmsg spawn.sh の readiness handshake）

team-up.sh に欠けている契約は、agmsg 側 `spawn` が既に持つ「watcher attach までブロックして検証」の handshake である（repo 外 read-only、`~/.agents/skills/agmsg/`）。

- `spawn.sh:576-588`: ready センチネル出現までブロックし、`status=ready` を出力（verbatim 抜粋: `while [ ! -e "$READY_PATH" ]; do ... echo "status=ready name=${NAME} team=${TEAM} after=${waited}s"`）。timeout で `status=timeout` exit 3。default `--ready-timeout` 90s（`spawn.sh:46-47`）— 対照実装の named 定数。
- `lib/actas-lock.sh:69-73` `agmsg_ready_path()`（verbatim: `printf '%s/ready.%s__%s' "$(_actas_lock_dir)" "$t" "$a"`）→ 実体 `$SKILL_DIR/run/ready.<enc(team)>__<enc(role)>`。存在 iff live watcher が receiving 中。
- 生成側 `watch.sh:294-310`: DB 可読性検査を通過後に `agmsg_ready_path` を touch → 「読めない watcher を ready と誤 signal しない」。
- team-up.sh は `TEAM_NAME`（`:66/:69/:119/:127`）・`role`（`member_role` `:835-840`、register `:1010-1024`）を保持するため、ready センチネル path を直接計算でき、機械判定の第一候補になる。watch.sh pidfile（`watch.<session_id>.pid`）は team-up が起動時点で session_id を知らないため team-up 側検証には不向き（`delivery.sh:264-278/283-295`）。
- 第2の arming 経路: `delivery.sh:302-311` `emit_monitor_directive()` が SessionStart hook 経由でエージェント初回ターンに watch.sh 起動を指示する。初期プロンプトが消えるとエージェントが初回ターンに到達せず directive も未実行 → 二重に watcher 未起動（#1384 記述と一致）。

## 区間交差（260721-teamup-safety-wait）

- `scripts/team-up.sh` +212 −8、新規 `scripts/team-up-codex-safety-wait.ts` +567。追加テスト: `tests/integration/t-team-up-codex-resume.serial.test.ts`, `t-team-up-msg-backend.test.ts`, `tests/unit/t-team-up-codex-safety-wait.test.ts`, fixture `tests/fixtures/team-up-codex-safety-wait/test-only-positive.json`。
- 変更内容: **Codex 専用** safety-wait supervisor（起動後に Codex safety モーダルを fingerprint 判定し `send-keys enter` で解除）を `:212-395` / `:1259` に配線。claude の init_prompt（`:800`）と起動配線（`:830-832`）は base 前後で構造不変（%q quoting 含む）。
- 交差評価: **claude の watcher 起動には無干渉**（`:340` で `RUNTIME=codex` 以外即 return）。ただし safety-wait は「team-up.sh 側で pane readiness を herdr 経由で検証する」実装先例として本 intent の設計に再利用価値が高い（`team-up-codex-safety-wait.ts:273-338` の `resolve`/`readVisible`、`team-up.sh:212-395` の lock dir / role-ready / supervise / rollback 構造）。ただし `resolve` の `agent === "codex"` フィルタは claude 非対応で拡張を要する。
- **回帰テスト空白**: 既存 team-up テストは init_prompt / `agmsg mode monitor` / ready / watch を一切参照しない（`grep -c` = 0 on t-team-up-msg-backend）→ watcher arming の回帰テストは現状ゼロ。修正時に新設が必要。

## 修正候補が触りうる seam（目録）

| seam | 場所 | 用途 |
| --- | --- | --- |
| init_prompt / 起動コマンド組立 | `team-up.sh:800`, `:830-832` | 再送・検証の挿入点 |
| pane 起動・launch 列 | `team-up.sh:429`, `:447`, `:1251-1257` | pane_id を握る箇所。検証ループの配置候補 |
| readiness フック点 | `team-up.sh:1259` `start_safety_wait_supervisors`（claude no-op） | claude 版検証の自然な差し込み位置 |
| ready センチネル | `agmsg_ready_path "$TEAM_NAME" "$role"` = `$AGMSG_ROOT/run/ready.<enc(team)>__<enc(role)>` | team-up が team+role を保持 → path 直接計算可。存在=live watcher receiving |
| herdr 再送（send/submit 2段） | `herdr pane send-text <pane> <text>` + `herdr pane send-keys <pane> enter`（両サブコマンド実在を実測） | 消えた `/agmsg mode monitor` を TUI 準備後に再注入。cid:code-generation:herdr-send-submit-two-step に従う |
| pane 可視テキスト読取 | `team-up-codex-safety-wait.ts:327-338` `readVisible`（`herdr pane capture --format text`） | TUI 準備状態の fingerprint 判定の先例 |

## Architect / requirements への未決点

1. **修正方式（設計判断・未決）**: (a) ready センチネル poll でブロック（spawn.sh 相当）/ (b) センチネル未出現時に `herdr pane send-text`+`send-keys enter` で `/agmsg mode monitor` 再注入 / (c) 両者併用（poll→timeout→再送→再 poll）。タイムアウト定数の対照は spawn.sh `--ready-timeout` default 90s（`spawn.sh:46-47`）。
2. **claude TUI の「プロンプト受理可能」fingerprint**: codex 側は `PRODUCTION_FINGERPRINTS` で固定済み（`team-up-codex-safety-wait.ts:72,177`）。claude で同等判定を要するか、ready センチネル poll だけで足りるかは設計判断。
3. **実行時未確認**: TUI 起動レースの本 tree 上の決定的再現（本 scan は静的読解のみ、再現率 5/6 は #1384 記録に依拠）、claude actas watcher の `ACTIVE_NAME` 取得タイミング（`watch.sh:300`）、`role` と agmsg 登録名・watch.sh 側 `$PAIRS` の実行時一致。
4. **回帰テスト**: watcher arming の落ちる実証（初期プロンプト取りこぼしの注入→watcher 未起動を検出）を新設する。fs/herdr 実使用は integration 層（fs-tests-integration-first 準拠）。
