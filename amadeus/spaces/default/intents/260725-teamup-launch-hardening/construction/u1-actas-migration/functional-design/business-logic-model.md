# Business Logic Model — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work-story-map.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`

- `unit-of-work.md` — U1 の作業項目7件と完了の定義を、下記の処理フローと分岐へ展開した。
- `unit-of-work-story-map.md` — US-1〜US-4 の Given/When/Then を、各フローの受け入れ条件として引いた。
- `requirements.md` — FR-1〜FR-5 / NFR-1〜NFR-3 を各ルールの根拠とした。
- `components.md` — U1 が触るコンポーネント表（新設 / 改変 / 廃止）を、下記のモデル境界とした。
- `component-methods.md` — `member_bootstrap_prompt` の契約と2キー消費者棚卸しを、ルールの詳細へ落とした。
- `services.md` — agmsg との契約（delivery mode が actas の前提条件であること）を、前提条件のルールとした。

測定 ref: HEAD `d0287bb87`。

## 対象の性質

本ユニットに業務ドメインは存在しない。対象は**チーム起動のオーケストレーション手順**であり、「ビジネスロジック」に相当するのは (a) どのプロンプトで各メンバーを起動するか、(b) 起動後の readiness をいつ・どう検証するか、の2つの判断である。以下はその2判断の状態遷移として記述する。

## 主フロー: チーム起動（`MSG_BACKEND=agmsg` / `RUNTIME=claude`）

| # | 手順 | 現行 | U1 後 |
|---|---|---|---|
| 1 | run 作成（worktree・run record） | `create_run` | 変化なし（U2 の対象） |
| 2 | agmsg へ全ロールを登録 | `register_team_members` | 変化なし |
| 3 | 各メンバーの delivery mode を `monitor` に設定 | `claude_member_cmd` 内（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`）） | **変化なし。ただし actas が watcher を起動する前提条件として意味を持つ** |
| 4 | 各メンバーの起動コマンドを組み立てる | `init_prompt="$CLAUDE_MONITOR_PROMPT"`（`:861`、全メンバー同一の定数） | `init_prompt="$(member_bootstrap_prompt "$m")"`（**メンバーごとに role を含む**） |
| 5 | stale sentinel をクリア | `watcher_verification_applies` が真のとき（`:1461-1463`） | 変化なし（判定入力のみ変わる） |
| 6 | ペインを生成し起動コマンドを実行 | `mux_new_session` / `mux_split` / `stack_column` | 変化なし |
| 7 | **検証** | `mux_attach` の**前**（`:1477-1480`） | **`mux_attach` の後ろへ移動** |
| 7.5 | codex 用 safety-wait supervisor の起動 | `start_safety_wait_supervisors \|\| exit 1`（`:1482`） | **変化なし**。`RUNTIME=claude` では `[ "$RUNTIME" = "codex" ] \|\| return 0` で即 return するため無害だが、検証と `mux_attach` の**間に挟まる**ため、手順7の移動時に見落とさないこと |
| 8 | アタッチ | `mux_attach`（`:1483`） | **7 より前に実行** |
| 9 | run record の確定 | `:1484-1492` | 変化なし |
| 10 | 終了 | `exit "$watcher_status"`（`:1497`） | 変化なし |

**変化の本質**: 手順4でメンバーごとに actas プロンプトを渡すことで agmsg が actas モードの watcher を起動し、sentinel が実際に書かれるようになる。手順7と8の順序を入れ替えることで、その検証が利用者のアタッチを妨げない。

## 判断1: 起動プロンプトの導出（FR-1, FR-2）

```
member_bootstrap_prompt(member):
  MSG_BACKEND が "agmsg" でない  → ""（空文字）
  それ以外                        → "/agmsg actas " + member_role(member)
```

`member_role` は `leader` → `leader`、`engineer-N` → `eN` を返す（`:896-901`、既存・不変）。

## 判断2: 検証の適用可否（FR-2、ADR-2）

```
watcher_verification_applies():
  RUNTIME が "claude" でない        → 偽
  MSG_BACKEND が "agmsg" でない      → 偽
  member_bootstrap_prompt(leader) が " actas " を含まない → 偽（理由を stderr へ1回だけ出す）
  それ以外                          → 真
```

代表 role を `leader` に固定できる根拠は ADR-2 の不変条件（プロンプト形の `" actas "` の有無は role に依存しない）。

## 状態遷移: watcher の readiness

```
[未起動] ──ペイン起動──> [Claude Code 起動中]
                              │
                              │ /agmsg actas <role> を処理
                              ↓
                        [actas モードで watcher 起動]
                              │
                              │ watch.sh が sentinel を書く（実測 T+32.2秒）
                              ↓
                          [armed]  ← verify_watchers_armed が観測する状態
```

**現行との差**: 現行は `/agmsg mode monitor` のため monitor モードの watcher が起動し、`[armed]` に**到達しない**（sentinel が書かれない）。

## 検証の制御フロー（FR-3, FR-4, NFR-2）

```
start_safety_wait_supervisors || exit 1   ← 現行 :1482 の位置を維持（mux_attach の直前）
  ↓                                          RUNTIME=claude では即 return 0（codex 専用）
mux_attach                                ← 利用者はここで作業を開始できる
  ↓
run record の確定                          ← 現行 :1484-1492
  ↓
watcher_status = 0
  ↓
watcher_verification_applies が真 ?         ← 移動してくるブロック（現行 :1477-1480）
  ├─ 偽 → 検証せず
  └─ 真 → verify_watchers_armed
            ├─ 全員 armed        → watcher_status = 0
            └─ タイムアウト      → watcher_status = 非ゼロ
                                    + 未 armed のメンバー名と回復手順を stderr へ
  ↓
launched メッセージ                        ← 現行 :1494
  ↓
exit watcher_status                        ← 現行 :1497
```

**`start_safety_wait_supervisors` の位置は変えない。** 現行の `:1482`（`mux_attach` の直前）のまま維持する。移動するのは検証ブロック（`watcher_status=0` の初期化行 `:1477` を含む `:1477-1480`）だけであり、それを `mux_attach` と run record 確定の**後ろ**へ持っていく。

移動前後の対応:

| 現行の順序 | U1 後の順序 |
|---|---|
| `:1477-1480` 検証ブロック | 4番目（run record 確定の後） |
| `:1482` `start_safety_wait_supervisors` | 1番目（位置不変） |
| `:1483` `mux_attach` | 2番目 |
| `:1484-1492` run record 確定 | 3番目 |
| `:1493-1494` `RUN_PREPARING=0` と launched メッセージ | 5番目 |
| `:1497` `exit "$watcher_status"` | 6番目（位置不変） |

`verify_watchers_armed` の本体（ポーリングと再送、`:1174-1213`）は**変更しない**。変えるのは呼び出し位置と、再送・診断に使うプロンプトの導出だけ。

## 最悪実行時間（NFR-1）

| 区間 | 時間 |
|---|---|
| 手順1〜8（アタッチまで） | 現行 5.87秒（3人構成）。U1 では変化しない |
| 手順7（検証、attach 後） | 最悪 `WATCHER_READY_TIMEOUT × (WATCHER_RESEND_MAX + 1)` |

`WATCHER_RESEND_MAX` は 1 のまま（NFR-2）。`WATCHER_READY_TIMEOUT` を実測 32.2秒 に接地した値へ縮めるため、スクリプト全寿命の最悪値は現行 180秒 から縮小する。
