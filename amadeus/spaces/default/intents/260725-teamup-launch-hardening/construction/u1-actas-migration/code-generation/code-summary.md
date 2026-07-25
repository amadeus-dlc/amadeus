# Code Summary — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/domain-entities.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/logical-components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/performance-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/reliability-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/security-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`

- `business-rules.md` — BR-1〜BR-22 を実装の受け入れ条件とした。特に BR-5（`" actas "` の有無が role に依存しない）はテストで固定した。
- `business-logic-model.md` — 「移動前後の対応」表に従って検証ブロックのみを移動し、`start_safety_wait_supervisors` の位置を保った。
- `domain-entities.md` — 所有境界（team-up.sh が持つ member/role/prompt と、agmsg が持つ delivery mode/watcher/sentinel/actas ロック）を引き、変更範囲を左側に限定した。INV-3（`" actas "` の有無が role 非依存）は BR-5 のテスト固定と対応する。
- `logical-components.md` — C-1〜C-11 の契約に従い、新設は `member_bootstrap_prompt` の1関数、廃止は `CLAUDE_MONITOR_PROMPT` のみとした。
- `performance-design.md` — D-P2 の `WATCHER_READY_TIMEOUT` = 60（実測 32.2秒 の約1.86倍）とマージン根拠のコメント要求を実装した。
- `reliability-design.md` — D-R2（診断3行）、D-R3（スキップ通知のラッチ維持）、D-R4（`delivery.sh set monitor` の保存）、D-R7（2キー grep）に従った。
- `security-design.md` — D-S1 に従い `printf '/agmsg actas %s' "$role"` とし、文字列連結・`eval` を避けた。
- `unit-of-work.md` — U1 の作業項目7件と「完了の定義」を実装スコープの境界とした。規模見積り（正本 約48行増/13行減）に対する実績は本書の変更ファイル節に記す。
- `requirements.md` — FR-1〜FR-5 / NFR-1〜NFR-8 を最終的な受け入れ基準とした。NFR-3（actas 排他ロックの実測）は conductor による実 launch で充足を確認した（本書「実 launch による受け入れ検証」節）。

- `business-rules.md` — BR-1〜BR-22 の充足状況を下記の対応表で報告した。
- `business-logic-model.md` — 「移動前後の対応」表どおりに制御フローを移したことを、実装後の行位置で確認した。
- `logical-components.md` — C-1〜C-11 の状態（新設 / 不変 / 廃止）が実装と一致することを確認した。
- `performance-design.md` — D-P1 / D-P2 の実装結果（移動後の位置とタイムアウト 60秒）を記録した。
- `reliability-design.md` — D-R2 の診断3行と D-R7 の2キー是正結果を記録した。
- `security-design.md` — D-S1 の実装形が verbatim で採用されたことを記録した。

コミット: `fc17dcc56`（ブランチ `feat/teamup-actas-migration-and-worktree-parallel`）。

## 変更ファイル

| ファイル | 種別 |
|---|---|
| `packages/framework/core/tools/team-up.sh` | 正本 |
| `tests/integration/t294-team-up-watcher-applicability.test.ts` | テスト |
| `tests/integration/t-team-up-watcher-arming.test.ts` | テスト |
| `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/team-up.sh` | 生成物（6面） |
| `{.claude,.codex,.cursor,.opencode}/tools/team-up.sh` | セルフインストール（4面） |

`team-up.sh` の同期は計11コピー（正本1 + dist 6 + self-install 4）で、BR-22 と一致する。agmsg（`~/.agents/skills/agmsg/`）は変更していない（BR-20 / D-S5）。

## 新設コンポーネント（C-1、BR-1〜BR-5、D-S1）

`member_role` の直後に定義した。設計 `security-design.md` D-S1 のコード形を verbatim で採用している。

```sh
member_bootstrap_prompt() {
  local m="$1" role
  [ "$MSG_BACKEND" = "agmsg" ] || { printf ''; return 0; }
  role="$(member_role "$m")"
  printf '/agmsg actas %s' "$role"
}
```

役割値は `printf` の `%s` で渡しており、文字列連結も `eval` も使っていない（D-S1）。副作用は stdout のみ（BR-4）。

## 判定入力の変更（C-3、ADR-2、BR-6 / BR-7）

```sh
watcher_verification_applies() {
  [ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ] || return 1
  # Derived once for a representative role: whether the prompt is an actas form
  # does not depend on the role (ADR-2), so the cost never scales with team size.
  case "$(member_bootstrap_prompt leader)" in
  *" actas "*) return 0 ;;
  esac
  if [ "$WATCHER_SKIP_ANNOUNCED" = "0" ]; then
    WATCHER_SKIP_ANNOUNCED=1
    echo "team-up: monitor-mode watcher writes no readiness sentinel — skipping arming verification (#1449/#1476)" >&2
  fi
  return 1
}
```

`WATCHER_SKIP_ANNOUNCED` ラッチは不変（C-4、BR-7、D-R3）。

## 制御フローの移動（C-10、D-P1、BR-8〜BR-11）

`business-logic-model.md` の「移動前後の対応」表どおりに実施した。

| 順序 | 内容 | 位置の扱い |
|---|---|---|
| 1 | `start_safety_wait_supervisors \|\| exit 1` | **位置不変** |
| 2 | `mux_attach "$S"` | — |
| 3 | run record 確定 | — |
| 4 | `watcher_status=0` + 検証ブロック | **ここへ移動** |
| 5 | `RUN_PREPARING=0` と launched メッセージ | — |
| 6 | `exit "$watcher_status"` | **位置不変** |

`clear_stale_watcher_sentinels` のガード（ペイン起動の前）も位置不変（BR-9、C-8）。`verify_watchers_armed` の本体（ポーリングと再送）は変更していない（C-5、D-P4）。`:1473-1476` の「an interactive attach would swallow it」というコメントは、`mux_attach` が非ブロッキング（`open -na Ghostty`）である事実と矛盾していたため、移動後の事実（exit code は依然として呼出元へ届き、待機がアタッチの前に入らない）へ書き換えた。

## 定数（C-6 / C-7、BR-15 / BR-16）

`WATCHER_READY_TIMEOUT` を 90 → **60** とし、直上コメントに実測 32.2秒 とマージンの根拠を記した。`WATCHER_RESEND_MAX` は **1 のまま変更していない**（BR-16）。最悪の検証予算は `60 × 2` = 120秒 で、アタッチ後に経過するため利用者の作業開始を妨げない（BR-11、D-P2）。

## 診断出力（C-9、D-R2、BR-12〜BR-14）

```
ERROR: agmsg watcher never armed for: <members> (after 1 re-send(s))
  The initial '/agmsg actas <role>' bootstrap prompt was dropped in the Claude Code startup race (Issue #1384).
  Recover manually: focus each listed pane and run the prompt for that member:
    leader: /agmsg actas leader
    engineer-1: /agmsg actas e1
```

回復ガイダンスは未 armed のメンバーごとに1行を出す（BR-14）。出力に含まれるのはメンバー名と役割名だけで、sentinel パス・セッション ID は出さない（D-S3）。

## 消費者の是正（BR-17 / BR-18、D-R7）

着手時の2キー grep（キー1 = 10件、キー2 = 6件、重複を除く一意行15）を全数是正した。実装後の再 grep 結果:

| 対象 | 残存 |
|---|---|
| `packages/framework/core/tools/team-up.sh` | **0**（両キーとも） |
| `scripts/` `docs/` | **0**（着手時から 0） |
| `tests/` | 3行（すべて意図的） |

`tests/` の3行は t294 の (a) ラッチ被覆用に `member_bootstrap_prompt` を非 arming 形へ上書きするフィクスチャ（`/agmsg mode monitor` をリテラルで使う）、(b) BR-17 の廃止確認テスト名と (c) その未定義 assert 本体である。いずれも旧実装への依存ではなく、廃止と縮退分岐を固定する記述である。

## 検証（すべて同期実行）

| コマンド | exit code |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bash tests/run-tests.sh --ci` | 0（546ファイル / 7567 assertions / 失敗 0） |

exit code はパイプを介さず、各コマンドの直後に `$?` を読んで取得した（`cid:code-generation:no-exit-capture-through-pipe`）。

## 落ちる実証（NFR-6、`org.md` Mandated）

修正コミット後に `git checkout fc17dcc56~1 -- packages/framework/core/tools/team-up.sh` で pre-fix 面を復元した（stash 不使用 — `cid:code-generation:falling-proof-no-stash`）。注入面は対象テストが `TEAM_UP_LIB_ONLY=1` で source する正本そのもの（`cid:code-generation:injection-surface-verify`）。

| 面 | 結果 |
|---|---|
| pre-fix（対象2ファイル） | exit 1、**9件 fail** / 11 pass |
| pre-fix（t294 単体、vacuity 是正後） | exit 1、**7件 fail** / 2 pass |
| post-fix | exit 0、20 pass / 0 fail |

赤くなったのは BR-1（actas 形）、BR-5（role 非依存の不変条件）、BR-6（既定構成での適用）、BR-14（メンバーごとの回復行）、BR-15（60秒）、BR-17（定数の廃止）を固定するテストで、いずれも本ユニットの変更点に対応する。

なお `herdr backend derives an empty bootstrap prompt` は当初 pre-fix でも green だった（関数が存在しなくても展開結果が空になる vacuity）。`declare -F member_bootstrap_prompt` のガードを足して塞ぎ、fail 件数が 6 → 7 へ増えることを実測した（`cid:code-generation:vocabulary-collision-vacuity-guard` と同族の空文化）。

## 未実施

| 項目 | 理由 |
|---|---|
| BR-21: 7人同時起動と resume（`-c`）での actas ロック競合の実測 | 実 launch（隔離インスタンス）を要し、本ステージの実行面外。conductor へ引き渡す。D-R6 は「恒久ブロックが確認された場合は実装を止めてユーザーへエスカレーション」と定めており、その判断点は未到達 |

## 実 launch による受け入れ検証（conductor 実測、2026-07-25）

実装者の検証（静的テスト・落ちる実証）に加え、conductor が隔離インスタンスで実 launch を行い、要件の受け入れ基準を実測した。

### BR-21 / NFR-3: actas 排他ロックの競合（7人構成）

| 項目 | 実測 |
|---|---|
| 構成 | leader + engineer×6（**最大構成**）、instance `bench3` |
| 終了コード | **0**（全メンバー armed） |
| ready sentinel | **7/7 生成**（`ready.amadeus-bench3__{leader,e1..e6}`） |
| actas ロック | **7/7 取得**（`actas.amadeus-bench3__*.session`） |
| ロック競合による起動失敗 | **なし** |

**#1384 の保護が導入以来はじめて機能した。** 現行 main では sentinel が1件も生成されない（`ready.*` が運用履歴 251 エントリ中 0件）のに対し、本実装では7人全員分が生成され検証が成功している。

### P-1 / NFR-1: アタッチ到達時間（3人構成）

| マイルストーン | 実測 |
|---|---|
| 全ペイン生成完了 | T+6.02秒 |
| **run record 確定（= `mux_attach` 済み。利用者が作業を開始できる時点）** | **T+6.02秒** |
| スクリプト終了（検証完了まで） | T+124.88秒 |
| 終了コード | **0** |

**検証の待機 118.86秒 が利用者体験から完全に切り離された。** ADR-5（検証を `mux_attach` の後ろへ）が設計どおり機能している。

前 intent のベースライン 5.87秒 に対しアタッチ到達は 6.02秒 で、**悪化していない**（P-1 の受け入れ基準を充足）。差の 0.15秒 は測定ノイズの範囲（worktree 作成の実測ばらつきが 1.013〜1.154秒/個）。

### 実測環境の撤去

両計測とも隔離インスタンス（`bench3` / `bench4`）で実施し、完全に撤去した。

- `git worktree list` が計測前後とも 32件で一致
- agmsg team 登録（`amadeus-bench3` / `amadeus-bench4`）残留 0
- sentinel / actas ロック残留 0
- herdr セッション削除済み

### 残る未検証事項

| 項目 | 状態 |
|---|---|
| resume（`-c`）でのロック残存 | **未実測**。build-and-test で扱う |
| R-3（actas の受信範囲制限が配送を壊さないか） | **未実測**。7人起動が成功したことは傍証だが、実際のメッセージ配送は試していない |

## 落ちる実証の確定値（conductor による独立再現、2026-07-25）

実装者の申告（9 fail / 11 pass）と §12a reviewer の再現（10 fail / 10 pass）に1件の差があったため、conductor が独立に再現して確定した。

```
git checkout fc17dcc56~1 -- packages/framework/core/tools/team-up.sh   # 対象ファイル限定、stash 不使用
bun test tests/integration/t294-team-up-watcher-applicability.test.ts \
         tests/integration/t-team-up-watcher-arming.test.ts
  → 10 pass / 10 fail

git checkout fc17dcc56 -- packages/framework/core/tools/team-up.sh     # post-fix へ復元
  → 20 pass / 0 fail
```

**確定値は 10 fail / 10 pass → 20 pass。** reviewer の再現と一致する。

実装者の申告値（9 fail）が1件少ないのは、**vacuity 是正の前に測った値**と考えられる。実装者は途中で `herdr backend derives an empty bootstrap prompt` が pre-fix でも green（関数不在でも展開が空になる構造的偽 green）であることを自己捕捉し、`declare -F` ガードを追加して t294 単体の fail が 6→7 へ増えたと報告している。この +1 が全体の 9→10 に対応する。

**教訓**: 落ちる実証の値は、テストを是正した**後**に測り直した値で記録する。是正前後の値が混在すると、後続の再現と食い違って原因追跡のコストを生む。

正本は post-fix 面へ復元済み（`git diff --quiet fc17dcc56 -- packages/framework/core/tools/team-up.sh` が exit 0）。
