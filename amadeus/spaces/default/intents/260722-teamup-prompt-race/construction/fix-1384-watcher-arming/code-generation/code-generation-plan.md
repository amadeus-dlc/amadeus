# Code Generation Plan — fix-1384-watcher-arming

上流入力(consumes 全数): requirements.md(FR-1〜7 / NFR-1〜4)、scan-notes.md(RE seam 目録)。

## 目的

`scripts/team-up.sh` の claude 経路で、全 fresh メンバーの agmsg watcher が確実に armed になることを、
ready センチネルの実在ポーリングで検証し、未 attach のメンバーへ `/agmsg mode monitor` を再送する
(Issue #1384: Claude Code TUI 起動レースで初期プロンプトが消失し watcher 未起動になる欠陥の回復)。

## 変更点目録

### scripts/team-up.sh(正本、唯一の実装面)

1. **定数(FR-4, NFR-4)** — `AGMSG_ROOT` 定義直後に追加:
   - `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"` — bootstrap プロンプトを単一定義化(launch と再送の両方で consume)。
   - `WATCHER_READY_TIMEOUT="${WATCHER_READY_TIMEOUT:-90}"` — per-wait タイムアウト(spawn.sh:132 `READY_TIMEOUT=90` と同値・同意味 = 1 ポーリングラウンドあたりの待ち)。
   - `WATCHER_RESEND_MAX="${WATCHER_RESEND_MAX:-2}"` — 再送上限(dispatch-ack-required の ack 上限と同値)。
   - `AGMSG_ACTAS_LOCK_LIB="${AGMSG_ACTAS_LOCK_LIB:-$AGMSG_ROOT/scripts/lib/actas-lock.sh}"` — センチネル path の canonical 定義元(source して関数呼び出し。path 文字列は複製しない)。

2. **`claude_member_cmd` 内 init_prompt(:800)** — `init_prompt="/agmsg mode monitor"` を `init_prompt="$CLAUDE_MONITOR_PROMPT"` に置換(定数の単一ソース化。出力文字列は不変)。

3. **検証ヘルパー関数群** — `register_team_members` の直前(lib-only 早期 return 行 :1180 より上)に追加。すべてテストから lib-only source で直接駆動可能:
   - `ready_sentinel_path <team> <role>` — `AGMSG_ACTAS_LOCK_LIB` を `SKILL_DIR=$AGMSG_ROOT` 付きサブシェルで source し `agmsg_ready_path` を呼ぶ(NFR-4: path 非複製、名前空間隔離)。
   - `resolve_member_pane <session> <label>` — `herdr agent list` JSON から label(=メンバー名)一致の pane_id を抽出(codex safety-wait の resolve と同一データ源)。
   - `resend_monitor_prompt <session> <pane> <prompt>` — `herdr pane send-text` + `herdr pane send-keys <pane> enter` の2段(cid:herdr-send-submit-two-step)。
   - `watcher_verification_applies` — `RUNTIME=claude` かつ `MSG_BACKEND=agmsg` のときのみ真(FR-6: claude 経路限定、herdr backend は監視対象なし)。
   - `clear_stale_watcher_sentinels` — 全メンバーの stale センチネルを spawn 前に `rm -f`(spawn.sh:572 同型)。
   - `verify_watchers_armed` — 全メンバー一括ポーリング(FR-3: per-member 直列にしない)→ タイムアウト分に再送(最大 `WATCHER_RESEND_MAX` 回)→ 再ポーリング。全員 armed で `return 0`、残存で警告(未 armed 列挙+手動復旧手順、spawn.sh:581-583 様式)+`return 1`。

4. **起動シーケンスへの配線(fresh-launch 経路 :1219-1271 のみ。resume-attach 経路 :1200-1217 は不変 = FR-7)**:
   - **stale 除去**: 最初の pane run(`P_TOP_LEFT` :1251)の直前に `watcher_verification_applies && clear_stale_watcher_sentinels`(spawn 後に消すと本物を消すため spawn 前に実施)。
   - **検証**: `stack_column`×2(:1256-1257)の後、`start_safety_wait_supervisors`/`mux_attach` の前に `verify_watchers_armed`(FR-5 [e5]: exit 判定は mux_attach より前に完了)。結果を `watcher_status` へ捕捉。
   - **exit code 分岐(FR-5)**: 末尾で `exit "$watcher_status"`(0=全員 armed / 非ゼロ=未 armed 残存)。launch 自体は完遂し pointer/status も記録する(run は実在)。

### tests/integration/t-team-up-watcher-arming.test.ts(新規、NFR-1)

実 FS を使う検証のため integration 層(cid:fs-tests-integration-first)。fake agmsg lib(自己完結の `agmsg_ready_path`)+ fake herdr + 制御されたセンチネル dir で駆動:
- `ready_sentinel_path` が canonical lib 経由で path を導出(NFR-4 の seam)。
- **ハッピーパス**: 全センチネル存在 → `verify_watchers_armed` が exit 0、再送なし。
- **落ちる実証(エラー)**: センチネル不在 + 再送しても現れない fake herdr → exit 非ゼロ、stderr に未 armed メンバー列挙。
- **再送回復(エッジ)**: 初回不在 → fake herdr `pane send-text` がセンチネルを touch → 2回目ポーリングで armed → exit 0。send-text と send-keys enter の2段呼び出しを log で固定。
- **冪等(FR-7 エッジ)**: 全センチネル存在 → 再送 0 回(fake herdr send log 空)。
- **stale 除去**: `clear_stale_watcher_sentinels` が既存センチネルを消す。
- `resolve_member_pane` の JSON parse。

### 既存 fixture 更新(NFR-2: 既存 CI green 維持)

`bash team-up.sh` を claude+agmsg で全起動する既存テストは検証経路に到達するため、fake herdr の `pane run` が
起動メンバーの ready センチネルを touch する(実 watcher の arming をシミュレート)ように fixture を更新する。
検証劇場ではなく、新挙動(fresh agmsg 起動時の watcher 検証)を実際に通す:
- `tests/integration/t-team-up-codex-resume.serial.test.ts`(claude+agmsg 全起動: 無引数 / -4 / -2 / --claude)
- `tests/integration/t-team-up-msg-backend.test.ts`(default fresh run)
両 fixture に: fake `actas-lock.sh`(自己完結 `agmsg_ready_path`)、`AGMSG_ROOT`/`AGMSG_ACTAS_LOCK_LIB`/`WATCHER_READY_TIMEOUT` 低め/`FAKE_READY_DIR`/`FAKE_TEAM` env、fake herdr `pane run` のセンチネル touch を追加。codex 経路は検証 skip なので影響なし。

## FR-6 codex 同型棚卸し(修正しない、code-summary へ記録)

`codex_member_cmd`(:910-978)の init prompt 経路を grep 実測し、同型の「一発供給・検証欠如」ギャップの有無を file:line で code-summary.md に記録する。修正・Issue 起票はしない(conductor が起票)。

## 非交差(NFR-2/3)

- 触るのは `scripts/team-up.sh` と `tests/` のみ。`packages/framework/`・`dist/` に触れない。
- 新規ランタイム依存なし(bash + 既存 agmsg/herdr seam のみ)。
- `dist:check` / `promote:self:check` は非交差の確認として実行。

## 検証コマンド(同期実行、exit code を code-summary へ実測転記)

- `bun run typecheck`
- `bun run lint`
- `bash -n scripts/team-up.sh`
- 新規 + 既存 team-up テスト(`bun test tests/integration/t-team-up-*.test.ts tests/unit/t-team-up-*.test.ts`)
- coverage registry check / 必要なら regen(cid:integration-registry-regen)
- `bun run dist:check && bun run promote:self:check`

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T23:38:41Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major3+Minor1+Info2 を conductor 実測(正パス4ファイル 94 pass、run-tests --ci PASS、watcher_status=0 :1412 実在、分岐粒度直読、file:line 全数照合)と summary 是正で閉包。iteration 2 で独立再実測により全件閉包確認、残指摘なし

### Findings

- None
