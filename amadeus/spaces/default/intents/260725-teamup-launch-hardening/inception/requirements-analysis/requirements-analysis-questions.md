# Requirements Analysis — Questions（260725-teamup-launch-hardening / #1476, #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/scope-document.md`、`amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `intent-statement.md` — Q1/Q2/Q3 の既決裁定と「達成したい状態」3項目を引き、本ステージで問うべき残余を絞った。
- `scope-document.md` — In/Out 境界と受け入れ基準の骨子（U1-1〜U1-5 / U2-1〜U2-3）を引き、質問が境界内に収まることを確認した。
- `architecture.md` — `mux_attach` が `open -na Ghostty`（非ブロッキング）である実測を引き、Q1 の前提を組み立てた。
- `code-structure.md` — `create_run` と `rollback_prepared_run` の行域を引き、Q2 の対象範囲を確定した。
- `business-overview.md` — Team Mode の利用者価値（アタッチして作業を開始できること）を引き、Q1 の評価軸をプロンプト復帰時刻に置いた。
- `team-practices.md` — ソロモード運用と検証コマンド群を引き、E-OC1 判定と受け入れ基準の検証手段を確定した。

## E-OC1 選挙不要判定

判定: **選挙不要（ソロモード）**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード（team.md § Operating Modes）。

leader 承認: 2026-07-25T12:20Z — ユーザーが conductor へ直接指示。以下 Q1/Q2 はユーザー直接裁定（AskUserQuestion 経由）による。

## 既決事項（本ステージで再度問わない）

`cid:requirements-analysis:no-election-for-decided-norms` に従う。

| 事項 | 裁定 | 出典 |
|---|---|---|
| 出荷単位 | ユニットごとに2 PR | intent-capture Q1 = A |
| 完了条件 | 実測2点 + テスト構造の是正 | intent-capture Q3 = A |
| 待機位置 | 検証を `mux_attach` の後ろへ移す | feasibility Q1 = A |
| 並列度 | 固定上限4 | feasibility Q2 = A |

---

## Q1: 検証を attach 後へ移した場合のスクリプト寿命

RE の実測により `mux_attach`（`team-up.sh:513-515`、verbatim: `  open -na Ghostty --args -e "$HERDR" session attach "$1"`）は**非ブロッキング**であり、`:1483` の後も `:1484-1496` の記録書き出しが続いて `:1497` の `exit "$watcher_status"` に到達することが判明した。したがって `:1473-1476` のコメントが述べる「an interactive attach would swallow it」は現行実装では成立せず、**exit code は attach 後でも保たれる**。

争点は「exit code が失われるか」ではなく「**attach 後にスクリプトが最大どれだけ生存してよいか**」（呼出元シェルのプロンプト復帰時刻）へ移る。現行定数では最悪 `WATCHER_READY_TIMEOUT`(90) × (`WATCHER_RESEND_MAX`(1)+1) = 180秒。

- A. **実測ベースでタイムアウトを縮小**する。検証は attach 後に走らせ、`WATCHER_READY_TIMEOUT` を実測 32.2秒 に余裕を見た値（例: 60秒）へ縮める。exit code は有意のまま、プロンプト復帰は最悪120秒。
- B. 現行値のまま（最悪180秒生存）。待機位置だけを変える最小変更。
- C. 完全にバックグラウンド化し、スクリプトは即座に exit 0。通知経路の新設が要る。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25T12:20Z、ソロモードにつき選挙なし）。検証を attach 後に走らせ、`WATCHER_READY_TIMEOUT` を実測 32.2秒 に接地した値へ縮小する。採用理由: (1) exit code の意味づけを壊さず（`mux_attach` 非ブロッキングの実測により保たれる）、(2) プロンプト復帰の最悪値を 180秒 → 120秒 へ半減でき、(3) C と違い通知経路の新設が不要。B は実測 32.2秒 に対し 90秒 という根拠の薄い値を残す。具体値は NFR で `cid:requirements-analysis:constants-from-code` に従い実測へ接地する。

---

## Q2: 並列 worktree 作成の部分失敗時のロールバック対象の決め方

現行の `create_run` は `git worktree add`（`:1305`）の直後に `CREATED_MEMBERS` へ追記（`:1306`）する**同一シェルの連続2行**で台帳を作り、`rollback_prepared_run`（`:1241-1251`）が `:1244` でそれを読んで巻き戻す。並列化するとこの含意（add 成功 ⇒ 台帳登録）がサブシェル境界で切れる。

- A. **worktree 実在走査で再導出**する。台帳を親プロセスへ回収せず、ロールバック時に `RUN_ROOT` 配下の実在ディレクトリを走査して対象を決める。並列化に伴う状態共有が不要で、部分失敗にも強い。
- B. 成功集合を親へ回収する。各子プロセスの成功を一時ファイル等で集約し `CREATED_MEMBERS` を再構成する。現行の台帳方式を保てるが、集約機構の新設が要る。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25T12:20Z、ソロモードにつき選挙なし）。ロールバック対象は `RUN_ROOT` 配下の worktree 実在走査で再導出する。採用理由: (1) 並列化に伴う子→親の状態共有機構を新設せずに済み（`org.md` Forbidden の「要求されていない機構の追加」を避ける）、(2) 台帳と実体の乖離という失敗様式そのものを消せる、(3) 部分失敗（add が途中で落ちた）でも実体を見るため取りこぼさない。B は集約機構が新たな障害点になる。
