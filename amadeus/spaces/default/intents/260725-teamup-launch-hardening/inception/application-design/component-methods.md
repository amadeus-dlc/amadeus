# Component Methods — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/component-inventory.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR-2（単一の導出関数）/ FR-6（並列度4）/ FR-7（実在走査）の受け入れ基準を、各関数のシグネチャと契約へ具体化した。
- `architecture.md` — sentinel の生成条件（actas モード）と launch シーケンス上の順序を引き、`member_bootstrap_prompt` の戻り値契約と検証の呼び出し位置を確定した。
- `component-inventory.md` — 既存関数のシグネチャ様式（`member_role` など）を引き、新設関数を既習の形に揃えた。
- `team-practices.md` — canonical 1定義原則を引き、プロンプト文字列の組立を1箇所へ集約する設計とした。

測定 ref: HEAD `0b0c6e20a`。

## 新設: `member_bootstrap_prompt`

```sh
# member_bootstrap_prompt <member> — echo the bootstrap prompt for <member>.
# Single source for the prompt (replaces the CLAUDE_MONITOR_PROMPT constant,
# which could not carry a role). Empty under the herdr backend, which has no
# agmsg monitor to arm.
member_bootstrap_prompt() {
  local m="$1" role
  [ "$MSG_BACKEND" = "agmsg" ] || { printf ''; return 0; }
  role="$(member_role "$m")"
  printf '/agmsg actas %s' "$role"
}
```

**契約**:
- 入力は member 名（`leader` / `engineer-1`〜`engineer-6`）。
- `MSG_BACKEND=agmsg` のとき `/agmsg actas <role>` を返す。role は `member_role` の出力（`leader` / `e1`〜`e6`）。
- `MSG_BACKEND=herdr` のとき**空文字**を返す（現行 `:881` の `init_prompt=""` と等価）。
- 副作用なし（純関数）。stdout のみ。

**呼び出し元**（FR-2 の「4参照点がすべてこれを経由する」）:

| 呼び出し元 | 現在地 | member 文脈 | 呼び出し方 |
|---|---|---|---|
| `claude_member_cmd` | `:861` | `$m` あり | `init_prompt="$(member_bootstrap_prompt "$m")"` |
| `watcher_verification_applies` | `:1094` | **なし** | 代表 role で導出（下記） |
| 再送 | `:1202` | ループ変数 `$m` あり | `resend_monitor_prompt "$S" "$pane" "$(member_bootstrap_prompt "$m")"` |
| 回復ガイダンス | `:1211` | unarmed リストあり | メンバーごとに導出して表示 |

## 改変: `watcher_verification_applies`

member 文脈を持たないため、**代表 role で導出した文字列**を判定に使う。

```sh
watcher_verification_applies() {
  [ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ] || return 1
  # The ready sentinel is written only by an actas watcher (agmsg watch.sh:307,
  # guarded at :300 by a non-empty ACTIVE_NAME). Probe the bootstrap prompt this
  # run actually uses; a monitor-mode prompt never arms the sentinel (#1449).
  case "$(member_bootstrap_prompt leader)" in
  *" actas "*) return 0 ;;
  esac
  ...  # 現行のスキップ通知（WATCHER_SKIP_ANNOUNCED ラッチ）を維持
  return 1
}
```

**設計判断**: 代表 role を `leader` に固定する。`member_bootstrap_prompt` は role をフォーマットに埋めるだけで、`" actas "` の有無は role に依存しないため、どの member で導出しても判定は同一になる。この不変条件を ADR-2 として記録する。

## 改変: タイムアウト診断メッセージ（FR-1, FR-2）

`verify_watchers_armed` のタイムアウト時に出る2行（`:1210-1211`）は、いずれも `/agmsg mode monitor` を前提としている。

```sh
# 現行 :1210（リテラル固定）
echo "  The initial '/agmsg mode monitor' prompt was dropped in the Claude Code startup race (Issue #1384)." >&2
# 現行 :1211（定数参照）
echo "  Recover manually: focus each listed pane and run '$CLAUDE_MONITOR_PROMPT'." >&2
```

**契約**:
- `:1210` のリテラル `'/agmsg mode monitor'` を actas 移行後の事実に合わせる（プロンプト名を書くなら `member_bootstrap_prompt` の形に合わせるか、プロンプト名を出さない表現にする）。
- `:1211` は unarmed メンバーごとに、そのメンバーが実行すべきプロンプトを表示する（role が異なるため単一文字列では表せない）。

## 改変: 検証の呼び出し位置（FR-3）

```sh
start_safety_wait_supervisors || exit 1
mux_attach "$S"                      # ← 先にアタッチ
... 記録書き出し（現行 :1484-1492）...
watcher_status=0
if watcher_verification_applies; then
  verify_watchers_armed || watcher_status=$?   # ← attach 後に検証
fi
echo "session '$S' launched ..."
exit "$watcher_status"
```

`clear_stale_watcher_sentinels`（`:1461-1463`）は**ペイン起動前のまま**（起動後だと本物の sentinel を消す）。

## 改変: `create_run` の worktree 生成（FR-6）

```sh
# Create the member worktrees, at most WORKTREE_PARALLELISM at a time.
# Measured on this repo (11,051 tracked files, .git 166M): serial 7.39s,
# concurrency 4 = 3.32s, concurrency 7 = 7.55s (slower than serial — git
# serialises on the object store, so an unbounded fan-out thrashes).
WORKTREE_PARALLELISM=4
```

**契約**:
- 同時実行数が `WORKTREE_PARALLELISM` を超えない。
- 各メンバーの `add` 失敗は**そのメンバー名とともに** stderr へ出す（FR-8）。
- 1つでも失敗したら `create_run` は非ゼロで返る。台帳（`CREATED_MEMBERS`）への逐次追記（`:1306`）は行わない。
- **メンバーごとの run record メタデータ書き込み（`:1307-1309` の `mkdir -p "$RUN_RECORD/members/$m"` と `path` / `branch`）はサブシェル内で行う。** 各メンバーのパスは互いに非交差（`$RUN_RECORD/members/<member>/`）であり、親への集約を要しない。これは `CREATED_MEMBERS`（親のシェル変数）とは異なり、ファイルシステムへの書き込みがサブシェル境界を越えて残るため成立する。

## 改変: `rollback_prepared_run`（FR-7）

```sh
# Roll back the worktrees this run created. The set is re-derived by scanning
# RUN_ROOT rather than read from a ledger: the parallel create loop runs each
# `git worktree add` in a subshell, so a ledger appended there would not reach
# the parent. Scanning the real directories also survives a partial failure.
```

**契約**:
- 対象は `RUN_ROOT` 配下に実在する member ディレクトリ。
- 部分失敗（一部の `add` が失敗）でも、成功した worktree がすべて巻き戻される。
- `CREATED_MEMBERS`（`:1244` 読取 / `:1306` 追記 / `:1392` 初期化）は廃止。

## 廃止される要素

| 要素 | 現在地 | 廃止理由 |
|---|---|---|
| `CLAUDE_MONITOR_PROMPT` | `:104` | 引数を持たない定数では role を含められない（FR-2） |
| `CREATED_MEMBERS` | `:1244` / `:1306` / `:1392` | 並列化でサブシェル境界を越えられず、実在走査が代替する（FR-7） |

いずれも**置換であって互換レイヤーを残さない**（`org.md` Forbidden、NFR-8）。

### 廃止に伴う消費者の棚卸し（`cid:code-generation:fixture-propagation-grep`）

棚卸しは**2つの検索キー**で行う。変数名だけでは、展開後のリテラル文字列に依存する消費者を取りこぼす。

**キー1: 変数名**（`CLAUDE_MONITOR_PROMPT` / `CREATED_MEMBERS`）

| 消費者 | 所在 | 影響 |
|---|---|---|
| `claude_member_cmd` / 適用可否ガード / 再送 / 回復ガイダンス | `:861` / `:1094` / `:1202` / `:1211` | 本設計で `member_bootstrap_prompt` 経由へ移す |
| `t294-team-up-watcher-applicability.test.ts` | **`:53`** / `:61` / `:75` / `:97` | **env 上書きによる駆動が効かなくなる**。関数の再定義または `MSG_BACKEND` 経由の駆動へ移す。`:53` は `printf '%s' "$CLAUDE_MONITOR_PROMPT"` で既定プロンプトを取得する行で、`:55` のリテラル検証と対になる |
| `t-team-up-watcher-arming.test.ts` | `:207` | 同上（`CLAUDE_MONITOR_PROMPT='/agmsg actas leader'` を前置して述語を駆動） |
| `rollback_prepared_run` の `CREATED_MEMBERS` 読取 | `:1244` | 実在走査へ置換（FR-7） |
| `CREATED_MEMBERS` 初期化 | `:1392` | 廃止 |

**キー2: 展開後のリテラル**（`/agmsg mode monitor`）

| 消費者 | 所在 | 影響 |
|---|---|---|
| ヘッダコメント | `:89` | actas 移行後は事実と異なる。更新する |
| 定数定義 | `:104` | 廃止（ADR-1） |
| タイムアウト診断メッセージ | `:1210` | リテラル固定。actas 移行後は事実と異なる（上記「改変: タイムアウト診断メッセージ」） |
| `t-team-up-watcher-arming.test.ts` | `:3`（コメント）/ **`:172`（`expect(err).toContain("/agmsg mode monitor")`）** | **`:172` は `:1210` の改修で無条件に破綻する**。診断メッセージの新しい表現に合わせて更新する |
| `t294-team-up-watcher-applicability.test.ts` | `:55`（`expect(...).toBe("/agmsg mode monitor")`） | 既定プロンプトのリテラル固定検証。`member_bootstrap_prompt` の出力検証へ移す |

> **注記（2026-07-25、functional-design reviewer の指摘により是正）**: 本表の初版は `t294` の `:53` を落としていた。棚卸しは**必ず grep 出力からの転記**で作ること — 記憶や既存表からの複製は同じ漏れを伝播させる（`cid:requirements-analysis:numbers-from-command-output-only` の列挙面）。全数の確定版は `construction/u1-actas-migration/functional-design/business-rules.md` の BR-18 を参照。

実装時は**両方のキーで** repo 全域を再確認する（配布11コピーを除く）:

```sh
grep -rn "CLAUDE_MONITOR_PROMPT\|CREATED_MEMBERS" packages/framework/core/tools/team-up.sh tests/
grep -rn "agmsg mode monitor" packages/framework/core/tools/team-up.sh tests/
```

（`cid:requirements-analysis:absence-claim-grep-verify` / `cid:code-generation:fixture-propagation-grep`。変数名 grep だけでは `:172` / `:55` のリテラル依存アサーションを構造的に捕捉できない。）
