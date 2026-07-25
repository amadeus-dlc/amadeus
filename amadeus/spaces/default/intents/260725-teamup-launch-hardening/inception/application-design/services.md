# Services — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/component-inventory.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — NFR-3（actas 排他ロックの検証）と FR-1（delivery mode の維持）が外部サービスとの契約に関わるため、その境界を整理した。
- `architecture.md` — repo 内と repo 外（agmsg）の境界、および sentinel を介した非同期の受け渡しを引いた。
- `component-inventory.md` — 外部 agmsg 7要素の登録を引き、本設計が依存する外部面を確定した。
- `team-practices.md` — 外部依存を read-only とする方針を引いた。

測定 ref: HEAD `0b0c6e20a`。

## サービス境界

本 intent は**新しいサービスを導入しない**。既存の外部依存3つとの契約が変わるのは agmsg のみで、しかも**呼び出し方（初期プロンプトの形）が変わるだけ**である。

## 外部サービス: agmsg（repo 外・read-only）

| 面 | 契約 | 本 intent での変化 |
|---|---|---|
| `delivery.sh set monitor <type> <project>` | プロジェクトの delivery mode を `monitor` にする。actas が watcher を起動する**前提条件** | **変化なし**（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`） の呼び出しを維持）。ただし本 intent で初めて「前提条件」として意味を持つ |
| 初期プロンプト `/agmsg actas <role>` | claude-code ドライバの actas フロー（`template.md:143` step 5d）が、delivery mode が `monitor` または `both` のとき `watch.sh <sid> <project> claude-code <role>` を起動する | **新規に使用**（現行は `/agmsg mode monitor`） |
| ready sentinel `ready.<team>__<role>` | actas モードの watcher が `watch.sh:307` で書き、cleanup で消す。**存在 ⇔ そのロールの live watcher が受信中** | **新規に観測可能になる**（現行は生成されない） |
| actas 排他ロック | `actas-claim.sh` が事前クレーム。他 live セッション保持時は `status=held` で **abort** | **新規に発火しうる**。NFR-3 で実測検証する |
| `join.sh` によるロール登録 | `register_team_members` が全ロールを事前登録 | 変化なし |

### 非同期の受け渡し

sentinel はファイルシステム経由の**片方向シグナル**である。team-up.sh は書き手ではなく**観測者**であり、書き手は各メンバーの Claude Code セッション内で動く watcher プロセスである。

この非同期性が待機設計を規定する: 観測に実測 32.2秒/1メンバーを要するため、`mux_attach` の前で待つと利用者体験を損なう（FR-3 の根拠）。

## 外部サービス: herdr

| 面 | 契約 | 本 intent での変化 |
|---|---|---|
| `pane run` / `pane send-text` / `pane send-keys` | ペイン起動と再送 | **変化なし**（送るプロンプト文字列だけが変わる） |
| `session attach` | `open -na Ghostty --args -e herdr session attach` で**非ブロッキング**に別ウィンドウを開く | **変化なし**。ただしこの非ブロッキング性が FR-3/FR-4 の成立根拠である |

## 外部サービス: git

| 面 | 契約 | 本 intent での変化 |
|---|---|---|
| `git worktree add` | worktree 作成。**並列実行しても失敗しない**（実測: 全並列度で成功 7/7、stderr 0 bytes）が、並列度を上げすぎるとスループットが劣化する | **並列呼び出しへ変化**（上限4） |

## 障害モードと縮退

| 障害 | 現行 | 本 intent 後 |
|---|---|---|
| agmsg 未インストール | `require_prerequisites` が起動前に拒否 | 変化なし |
| delivery mode の設定失敗 | WARN を出して続行（`:878`） | 変化なし。ただし actas が watcher を起動しないため検証が失敗する — これは**正しい検出**であり縮退ではない |
| actas ロック競合 | 発生しない（actas を使わないため） | **abort しうる**。NFR-3 で実測し、必要なら診断メッセージを足す |
| worktree 作成の部分失敗 | 台帳経由で巻き戻し | 実在走査で巻き戻し（FR-7）。失敗メンバーを特定して報告（FR-8） |
| sentinel が出ない | 検証をスキップ（PR #1477 のガード） | 検証が走り、タイムアウト後に非ゼロ終了 + 回復ガイダンス。**attach は既に済んでいる**ため利用者は作業を開始できる |
