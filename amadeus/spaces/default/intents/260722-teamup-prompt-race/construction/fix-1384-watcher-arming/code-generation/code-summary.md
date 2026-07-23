# Code Summary — fix-1384-watcher-arming

上流入力(consumes 全数): code-generation-plan.md、requirements.md、scan-notes.md。

Issue #1384(claude fresh メンバーの agmsg watcher が起動レースで未 armed になる欠陥)の回復。
`scripts/team-up.sh` の claude 経路に ready センチネル検証 + 監視プロンプト再送を追加。

## 変更 file:line 目録

### scripts/team-up.sh(正本、+163 行)

| 箇所 | file:line | 内容 |
| --- | --- | --- |
| 定数 `CLAUDE_MONITOR_PROMPT` | team-up.sh:69 | `/agmsg mode monitor` を単一定義化(launch + 再送で consume) |
| 定数 `WATCHER_READY_TIMEOUT` | team-up.sh:73 | per-wait タイムアウト 90s(spawn.sh:132 `READY_TIMEOUT=90` と同値・per-wait 意味に明文化 = FR-4 [e3]) |
| 定数 `WATCHER_RESEND_MAX` | team-up.sh:76 | 再送上限 2(dispatch-ack-required の ack 上限と同値 = FR-4) |
| 定数 `AGMSG_ACTAS_LOCK_LIB` | team-up.sh:80 | センチネル path の canonical 定義元(source して呼ぶ。path 非複製 = NFR-4) |
| init_prompt の定数化 | team-up.sh:823 | `init_prompt="$CLAUDE_MONITOR_PROMPT"`(旧 literal を単一ソース化。出力文字列は不変) |
| `watcher_verification_applies` | team-up.sh:1039 | `RUNTIME=claude && MSG_BACKEND=agmsg` のみ真(FR-6 claude 経路限定・herdr backend/codex 除外) |
| `ready_sentinel_path` | team-up.sh:1050 | `SKILL_DIR=$AGMSG_ROOT` サブシェルで lib を source し `agmsg_ready_path` を呼ぶ(NFR-4・名前空間隔離) |
| `resolve_member_pane` | team-up.sh:1065 | `herdr agent list` JSON から label(=メンバー名)一致の pane_id を抽出(codex resolve と同一データ源) |
| `resend_monitor_prompt` | team-up.sh:1082 | `pane send-text` + `pane send-keys <pane> enter` の2段(FR-2 / cid:herdr-send-submit-two-step) |
| `clear_stale_watcher_sentinels` | team-up.sh:1094 | 全メンバーの stale センチネルを spawn 前に `rm -f`(spawn.sh:572 同型) |
| `verify_watchers_armed` | team-up.sh:1111 | 全メンバー一括ポーリング→タイムアウト分に再送(最大2回)→再ポーリング。全員 armed=0 / 残存=警告+return 1(FR-3/4/5/7) |
| stale 除去の配線 | team-up.sh:1393-1398 | 最初の pane run(`P_TOP_LEFT`)の直前に `watcher_verification_applies && clear_stale_watcher_sentinels`(spawn 前に実施) |
| 検証の配線 | team-up.sh:1406-1415 | `stack_column` 後・`start_safety_wait_supervisors`/`mux_attach` 前に `watcher_status=0` を :1412 で事前初期化のうえ `verify_watchers_armed || watcher_status=$?`(:1414。set -euo pipefail 下で未初期化 exit を構造的に排除。FR-5 [e5]: exit 判定は attach 前に完了) |
| exit code 分岐 | team-up.sh:1430-1432 | 末尾 `exit "$watcher_status"`(0=全員 armed / 非ゼロ=未 armed。launch 自体は完遂・記録) |

resume-attach 経路(team-up.sh:1348-1361)は不変 = FR-7(leader resume 経路の非退行)。

### tests/integration/t-team-up-watcher-arming.test.ts(新規、NFR-1)

lib-only source で bash 検証 seam を直接駆動(fake agmsg lib + fake herdr + 実 FS センチネル、integration 層 = cid:fs-tests-integration-first):
- `ready_sentinel_path` の lib 経由導出(NFR-4 seam)、`resolve_member_pane` の JSON parse(順序非依存・不在→空)、`clear_stale_watcher_sentinels`
- **ハッピーパス**: 全 armed → exit 0・再送 0(冪等 FR-7)
- **落ちる実証(エラー)**: 未 armed が回復しない → exit 非ゼロ・stderr にメンバー列挙+復旧手順(FR-5)
- **再送回復(エッジ)**: send-text がセンチネルを touch → 2回目ポーリングで armed → exit 0・各メンバー send-text→send-keys enter の2段順序を固定
- `watcher_verification_applies` の claude+agmsg 限定を4組合せで固定(FR-6)

### 既存 fixture 更新(NFR-2: 既存 gate green 維持)

`bash team-up.sh` を claude+agmsg で全起動する既存テストは検証経路に到達するため、fake herdr の `pane run` が
起動メンバーの ready センチネルを touch(実 watcher の arming をシミュレート)するよう更新。role-only の stub lib で
instance 由来 team 名に非依存化(sentinel 名の team+role 忠実性は新規 test でカバー):
- tests/integration/t-team-up-codex-resume.serial.test.ts(+33): fake lib/run dir、fake herdr `pane run` touch、env(AGMSG_ROOT/AGMSG_ACTAS_LOCK_LIB/FAKE_READY_DIR/WATCHER_READY_TIMEOUT=5)
- tests/integration/t-team-up-msg-backend.test.ts(+34): 同上

## FR-6 codex 同型棚卸し(same-root-inventory、修正しない — Issue 起票は conductor)

codex 経路(`codex_member_cmd`)を実測:
- 初期プロンプト供給: **team-up.sh:936** `prompt="\$agmsg actas $role"` を **team-up.sh:999-1000** の `printf ... %q` 末尾 argv で CODEX_MONITOR 経由に一度だけ渡す。claude 側(旧 :800/現 :823+:855)と**同型の「一発供給」**。
- 検証・リトライ: codex 経路にも watcher attach の検証・再送は**不在**(`start_safety_wait_supervisors` は team-up.sh:340 `[ "$RUNTIME" = "codex" ] || return 0` で codex 限定だが、これは Codex safety 確認モーダル解除であって agmsg watcher arming の検証ではない)。
- **本 fix の ready センチネル検証は codex には直接転用不可**: agmsg は codex を `monitor=no` 扱いとし、spawn.sh:565-568(「types with no Monitor at all (codex)」)のとおり codex は spawn-awaitable な ready センチネルを持たない(codex は poll ベースの codex-monitor.sh)。よって `agmsg_ready_path` センチネル poll は codex 経路に適用できない。

**結論(有無+file:line)**: 同型の「初期プロンプト一発供給・watcher arming の検証欠如」ギャップは codex 経路に**存在する**(team-up.sh:936, :999-1000)。ただし回復手段は claude と別機序(ready センチネル非対応)であり、codex 向けの readiness ガード要否は別 intent の判断。修正・Issue 起票は本 intent では行わない(FR-6 裁定 B、conductor が起票)。

## 検証コマンドと実測 exit code(すべて同期実行、パイプ越し capture なし)

| コマンド | exit code | 備考 |
| --- | --- | --- |
| `bun run typecheck` | 0 | `tsc --noEmit`(bun install 後)|
| `bun run lint` | 0 | Biome warnings 250 は全て未変更の framework ファイル由来(pre-existing)。変更ファイル3件を個別 biome check → 診断0 |
| `bash -n scripts/team-up.sh` | 0 | 構文検証 |
| `bun test tests/integration/t-team-up-watcher-arming.test.ts tests/integration/t-team-up-msg-backend.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts tests/unit/t-team-up-codex-safety-wait.test.ts` | 0 | 94 pass / 0 fail、`Ran 94 tests across 4 files` — conductor 再実行(2026-07-22T23:38Z 頃)で全4パス実在+ファイル数一致を確認(cid:test-path-set-completeness。初版表記はパス2件のディレクトリ欠落があり是正) |
| `bash tests/run-tests.sh --ci` | 0 | RESULT: PASS(smoke 14 / unit 252 / integration 195 / e2e 75 / other 2 — conductor 実行。NFR-2 明示要求。wall-clock drift 1件は未変更ファイル t-codex-hooks-migration の負荷起因 advisory) |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh・guards green・ratchet held(新規 test の drift なし) |
| `bun run dist:check` | 0 | 全 harness tree 同期(非交差確認) |
| `bun run promote:self:check` | 0 | self-install 同期(非交差確認) |

## 逸脱の有無

**なし**。requirements.md FR-1〜7 / NFR-1〜4 に準拠。既存様式(spawn.sh 定数・cid:herdr-send-submit-two-step・cid:degrade-scope-unit-dir-layout・cid:fs-tests-integration-first)に沿って実装。`packages/framework/`・`dist/` に非交差(NFR-2/3)、新規依存なし。

補足(逸脱ではない設計判断): 既存の full-launch fixture 2件は新検証経路に到達するため、fake herdr で watcher arming を
シミュレートして通した(検証劇場でなく新挙動を実際に通す)。role-only stub は sentinel 名の team+role 忠実性を
新規 test に委ね、instance テストの team 名差(amadeus-alpha)による偽 hang を回避するための decoupling。
