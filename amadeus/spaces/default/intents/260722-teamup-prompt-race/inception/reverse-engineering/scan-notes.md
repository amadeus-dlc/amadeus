# Reverse Engineering — Code Scan Notes

intent: `260722-teamup-prompt-race`（bugfix / Minimal depth）
担当: Developer スキャン（RE 2.1）
対象バグ: GitHub Issue #1384 — `scripts/team-up.sh` の fresh セッションで初期プロンプト `/agmsg mode monitor` が Claude Code TUI 起動レースで消失し watcher が起動しない（再現率 5/6）

---

## 1. 実行メタデータ

| 項目 | 値 |
| --- | --- |
| date (UTC) | 2026-07-22T22:03:26Z |
| observed SHA (実測 `git rev-parse HEAD`) | `a81c11dde83e0059c48ecc912d2d22dd6bca60eb` |
| base | `a326f47bc0146a3b4285552f42b92fd61fb343a7` |
| 祖先性 `git merge-base --is-ancestor base HEAD` | exit 0（実測） |
| distance `git rev-list --count base..HEAD` | 101 |

### diff 規模（機械集計、ref = base..HEAD）

- コマンド: `git diff --shortstat a326f47..HEAD`
  出力: `2593 files changed, 349417 insertions(+), 5289 deletions(-)`
- コマンド: `git diff --name-only base..HEAD | wc -l` → `2593`
- ディレクトリ別上位（`git diff --name-only base..HEAD | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn`）:
  - `amadeus/spaces` 2020（RE codekb・intent record の記録面が大半）
  - `tests/integration` 55 / `tests/unit` 47 / `packages/framework` 44
  - `scripts/formal-verif` 36 / `tests/formal-verif` 16（新規大型領域 = 260720-formal-verif-experiment 由来。本バグ面と無関係）
  - `dist/*` 各ハーネス 27〜31（生成物）
  - `.{claude,codex,cursor,opencode}/tools` 各 14（生成物）

俯瞰: 差分 2593 ファイルのうちアプリ実コードの本バグ交差面は `scripts/team-up.sh`（+212 −8）と付随テストのみ。`scripts/formal-verif` / `tests/formal-verif` は別 intent の新規領域で本バグと無交差。

---

## 2. 欠陥の所在（一発勝負 = 検証・リトライ欠如）

### 2.1 初期プロンプトの供給経路（claude、fresh 分岐）

`scripts/team-up.sh:799-833` `claude_member_cmd()`:

- `:800` `local m="$1" wt="${2:-$BASE/$1}" args="" init_prompt="/agmsg mode monitor" interaction_args=""`
  — init_prompt をここで固定。
- `:814-821` agmsg backend のときのみ `bash "$DELIVERY" set monitor claude-code "$wt"` を実行し（`:816-817`）、herdr backend では `init_prompt=""`（`:820`）。設定面（delivery set monitor）は正常。
- `:830-832` 起動コマンド組立（verbatim）:
  ```
  printf 'cd %q && mise trust -q 2>/dev/null; AMADEUS_OPERATING_MODE=team %sTEAM_MSG=%q CLAUDE_IDENTITY=%q %q %s %s %q; exec $SHELL -l' \
    "$wt" "$log_env" "$MSG_BACKEND" "$CLAUDE_IDENTITY" "$REPO/scripts/run-claude.sh" "$args" "$interaction_args" "$init_prompt"
  ```
  `%q`（`$init_prompt`）で quoting は正常。init_prompt は `run-claude.sh` の末尾 argv として渡る。

`scripts/run-claude.sh`（全文）: 末尾 `exec claude --dangerously-skip-permissions "$@"`。
→ init_prompt `/agmsg mode monitor` は **claude CLI の位置引数（初期プロンプト）** として一度だけ渡される。TUI 起動レースで取りこぼされると再送・検証は一切ない。

### 2.2 起動の実配線（herdr pane run で一度実行するだけ）

- `scripts/team-up.sh:429`（`mux_new_session`）と `:447`（`mux_split`）: いずれも `"$HERDR" --session "$s" pane run "$pane" "$cmd" >/dev/null`。
  cmd は 2.1 の shell 文字列。**pane run は cmd を一度 exec するのみで、claude が初期プロンプトを受理したか / watcher が attach したかの検証はない。**
- 起動シーケンス `:1251-1257`: `mux_new_session` → `mux_split`×2 → `stack_column`×2 でパネル生成、直後 `:1259` `start_safety_wait_supervisors || exit 1`、`:1260` `mux_attach`。
- `start_safety_wait_supervisors()`（`:338-395`）は **`:340` `[ "$RUNTIME" = "codex" ] || return 0`** で claude では即 return。
  → **claude runtime には readiness 検証が構造的に存在しない**。欠陥形状「初期プロンプト一発勝負で watcher attach の検証・リトライがない」を確定。

---

## 3. 対照実装（agmsg spawn.sh の readiness handshake）

参照は repo 外 read-only: `~/.agents/skills/agmsg/scripts/`（skin `SKILL_DIR` = `~/.agents/skills/agmsg`）。

### 3.1 spawn.sh — ready センチネルまでブロック（#108）

`spawn.sh`:
- `:44-47` `--no-wait`（ブロックしない）/ `--ready-timeout N`（default 90、timeout で `status=timeout` exit 3）。
- `:60-61`（コメント verbatim）「Readiness: by default spawn blocks until the new agent's watcher attaches and is receiving (it prints `status=ready ...`)」。
- `:564` `READY_PATH="$(agmsg_ready_path "$TEAM" "$NAME")"`。
- `:565-568` `monitor=no` 型（codex 等）は handshake を skip。
- `:572` 起動前に stale センチネルを `rm -f`。
- `:576-588`（verbatim 抜粋）:
  ```
  while [ ! -e "$READY_PATH" ]; do
    if [ "$waited" -ge "$READY_TIMEOUT" ]; then
      echo "status=timeout name=${NAME} team=${TEAM} after=${READY_TIMEOUT}s"
      ... exit 3
    fi
    sleep 1; waited=$((waited + 1))
  done
  echo "status=ready name=${NAME} team=${TEAM} after=${waited}s"
  ```
  → **watcher attach（status=ready）までブロックして検証する**。これが team-up.sh に欠けている契約。

### 3.2 ready センチネルの生成側（watch.sh）と path

`lib/actas-lock.sh:69-73` `agmsg_ready_path()`（verbatim）:
```
agmsg_ready_path() {
  local team="$1" agent="$2"
  local t a; t="$(_actas_lock_encode "$team")"; a="$(_actas_lock_encode "$agent")"
  printf '%s/ready.%s__%s' "$(_actas_lock_dir)" "$t" "$a"
}
```
- `_actas_lock_dir() { printf '%s/run' "$SKILL_DIR"; }`（`:36`）→ 実体 `~/.agents/skills/agmsg/run/`。
- `_actas_lock_encode`（`:43-54`）: `[A-Za-z0-9._-]` はそのまま、他は `%%%02X` パーセントエンコード（awk）。
- コメント `:63-68`「present iff a live watcher is currently receiving for that role. `spawn` uses it to block until a freshly launched agent is actually listening」。

`watch.sh`（センチネルを touch する側、exclusive/actas watcher のみ）:
- `:294-310`（verbatim 抜粋）:
  ```
  if [ -n "$ACTIVE_NAME" ]; then
    while IFS=$'\t' read -r _rt _ra; do
      [ -z "$_rt" ] && continue
      _rp="$(agmsg_ready_path "$_rt" "$_ra")"
      printf '%s\n' "$SESSION_ID" > "$_rp" 2>/dev/null || true
      ...
    done <<< "$PAIRS"
  fi
  ```
  DB 可読性検査（`:289-292`）を通過した後に touch → 「読めない watcher を ready と誤signalしない」。exit 時に cleanup（`:132-150` の READY_FILES 除去）。

### 3.3 watch.sh の pidfile（delivery.sh の live 判定）

- `watch.sh:32` 「Writes a pidfile at `~/.agents/agmsg/run/watch.<session_id>.pid`」（注: 実 RUN_DIR は `$SKILL_DIR/run` = `~/.agents/skills/agmsg/run`、`delivery.sh:34` `RUN_DIR="$SKILL_DIR/run"`）。
- `delivery.sh:283-295` `emit_monitor_directive()`: `pidfile="$RUN_DIR/watch.$session_id.pid"` を読み、`kill -0 "$existing"` で生存確認、生存時は「A watch.sh is already streaming into this session (pid $existing).」を出して directive を skip（`:288-294`）。
- `delivery.sh:222-238` `agmsg_delivery_runtime_status_default()`: `$RUN_DIR/watch.*.pid` を走査し `kill -0` で alive/stale を集計（`echo "watch processes: $alive alive, $dead stale pidfiles"`）。
- **注意点**: pidfile / directive は `session_id`（`CLAUDE_CODE_SESSION_ID` 由来、`delivery.sh:264-278`）でキーされる。team-up.sh は起動時点でこの session_id を知らない → pidfile 経由の team-up 側検証は困難。**ready センチネル（team+role でキー、team-up.sh が両方保持）の方が team-up.sh から機械判定しやすい**。

### 3.4 SessionStart hook 側の directive（第2の arming 経路）

`delivery.sh:302-311` `emit_monitor_directive()` は `AGMSG-DIRECTIVE: ... invoke the Monitor tool now with: command: <watch.sh ...>` を stdout に出す。これは SessionStart hook 経由でエージェントの**初回ターンで消費**される指示であり、初期プロンプトが消えるとエージェントが最初のターンに到達しないため directive も未実行 → 二重に watcher 未起動（Issue #1384 の記述と一致）。

---

## 4. 修正候補が触りうる seam の目録

検証（watcher attach 確認）+ 再送を team-up.sh 側に実装する場合に読むべき箇所:

| seam | 場所 | 用途 |
| --- | --- | --- |
| init_prompt / 起動コマンド組立 | `team-up.sh:800`, `:830-832` | 何を一発で送っているか。再送・検証の挿入点 |
| pane 起動 | `team-up.sh:429`, `:447`（`mux_new_session`/`mux_split`）と launch 列 `:1251-1257` | pane_id を握る箇所。検証ループの配置候補 |
| readiness フック点 | `team-up.sh:1259` `start_safety_wait_supervisors`（現状 claude no-op） | claude 版 readiness 検証の自然な差し込み位置 |
| ready センチネル（機械判定の第一候補） | `agmsg_ready_path "$TEAM_NAME" "$role"` = `$AGMSG_ROOT/run/ready.<enc(team)>__<enc(role)>` | team-up.sh は `TEAM_NAME`(`:66/:69/:119/:127`)・`role`(`member_role`, `:835-840`) を保持 → path 直接計算可。存在=live watcher receiving |
| watch.sh pidfile | `$AGMSG_ROOT/run/watch.<session_id>.pid` | session_id 未知のため team-up 側検証には不向き（3.3 参照） |
| delivery status | `bash "$DELIVERY" status ...` / `agmsg_delivery_runtime_status`（`delivery.sh:222-238`） | 代替の live 集計（session 非特定） |
| herdr 再送（send/submit 2段） | `herdr pane send-text <pane> <text>` + `herdr pane send-keys <pane> enter`（`herdr pane --help` 実測で両サブコマンド実在） | 消えた `/agmsg mode monitor` を TUI 準備後に再注入する手段。cid:code-generation:herdr-send-submit-two-step（send と enter は対で必須）に従う |
| pane 可視テキスト読取（TUI 準備検出） | 先例 `team-up-codex-safety-wait.ts:327-338` `readVisible`（`herdr pane capture --format text`） | pane が受理可能状態かの fingerprint 判定の先例 |
| pane→role 解決 | `team-up-codex-safety-wait.ts:92-96` `roleToAgentLabel`（leader / `e[1-6]`→`engineer-N`）, `:273-325` `resolve`（`herdr agent list` JSON→pane_id） | role からパネルを引く先例（現状 `agent === "codex"` フィルタで claude 非対応、拡張要） |
| readiness 検証の設計先例（構造） | `team-up.sh:212-395`（safety_wait 一式: lock dir / owner pid / ps 照合 / role-ready / supervise / rollback） | Codex safety-wait が「起動後に pane readiness を検証する」既存パターン。claude 版検証はこの構造に倣える |

---

## 5. base..HEAD 差分と本バグ面の交差（260721-teamup-safety-wait）

- `scripts/team-up.sh` +212 −8、新規 `scripts/team-up-codex-safety-wait.ts` +567（`git diff --stat`）。
- 追加テスト: `tests/integration/t-team-up-codex-resume.serial.test.ts`, `tests/integration/t-team-up-msg-backend.test.ts`, `tests/unit/t-team-up-codex-safety-wait.test.ts`, fixture `tests/fixtures/team-up-codex-safety-wait/test-only-positive.json`。
- 何が変わったか: **Codex 専用の safety-wait supervisor**（起動後に Codex の safety 確認モーダルを fingerprint 判定し `send-keys enter` で解除する）を新設。`team-up.sh:212-395`, `:1259` に配線。
- 本バグ面との交差: **claude の init_prompt / watcher 起動には無干渉**（`start_safety_wait_supervisors` は `:340` で `RUNTIME=codex` 以外即 return）。`claude_member_cmd` の init_prompt 行（`:800`）と起動配線（`:830-832`）は base 前後で構造不変（%q quoting 含む）。
- ただし safety-wait は「team-up.sh 側で pane readiness を herdr 経由で検証する」実装先例として本 intent の設計に**再利用価値が高い**（§4 参照）。
- 既存の team-up テストは init_prompt / `agmsg mode monitor` / ready / watch を一切参照しない（`grep -c` = 0 on t-team-up-msg-backend）→ **watcher arming の回帰テストは現状ゼロ**。修正時に新設が必要。

---

## 6. 不確定事項（実測できなかったこと / 設計で確定すべき点）

1. **TUI 起動レースの直接再現**: 本スキャンは静的読解のみ。再現率 5/6 の一次観測は Issue #1384 のクロスレビュー記録に依拠しており、本 tree 上でのレース実測（初期プロンプト取りこぼしの決定的再現）は未実施。
2. **claude の ready センチネル生成タイミング**: watch.sh がセンチネルを touch するのは「エージェントが Monitor tool で watch.sh を起動した後」。初期プロンプトが消えるとエージェントは watch.sh を起動しない → **センチネルは永久に現れない**という想定は §3.2/§3.4 から論理的に成立するが、claude actas watcher が team-up 環境で実際にどのタイミングで `ACTIVE_NAME` を持つか（`watch.sh:300`）は実行時未確認。
3. **team-up.sh の `role` と agmsg 登録名の一致**: `register_team_members`（`:1010-1024`）は `AGMSG_JOIN "$TEAM_NAME" "$role" ...`（role = leader / e1..）で登録。`agmsg_ready_path "$TEAM_NAME" "$role"` が指すセンチネルと一致する前提は登録コード上整合するが、watch.sh 側の `$PAIRS`（rt/ra ペア）が同名で回るかは実行時未確認。
4. **herdr pane capture による TUI 準備検出の適用可否**: claude TUI の「プロンプト受理可能」状態の安定した fingerprint が存在するか未調査（codex 側は `PRODUCTION_FINGERPRINTS` で固定済み、`team-up-codex-safety-wait.ts:72,177`）。claude で同等の判定を要するか、ready センチネル poll だけで足りるかは設計判断。
5. **修正方式の選択**: (a) ready センチネル poll でブロック（spawn.sh 相当）/ (b) センチネル未出現時に `herdr pane send-text`+`send-keys enter` で `/agmsg mode monitor` 再注入 / (c) 両者併用（poll→timeout→再送→再 poll）のいずれを採るかは requirements/設計で確定。タイムアウト定数は spawn.sh の `--ready-timeout` default 90s が対照実装の named 値（`spawn.sh:46-47`）。
