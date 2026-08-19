# 要件分析の確認事項

Issue #3029 の established facts と reverse-engineering 成果物を前提に、実装契約を確定するための質問です。回答はこのファイルの `[Answer]:` に記録します。

参照入力:

- `amadeus/spaces/default/codekb/amadeus/business-overview.md`
- `amadeus/spaces/default/codekb/amadeus/architecture.md`
- `amadeus/spaces/default/codekb/amadeus/code-structure.md`
- `amadeus/spaces/default/codekb/amadeus/re-scans/260818-issue-3029-sensor-gate.md`

## Q1. exit 127 の blocking semantics

per-sensor script が exit 127 を返したとき、blocking sensor の completion gate はどう扱うべきですか。

- A. **fail-closed（推奨）** — `tool-unavailable` を blocking failure として扱い、stage completion を拒否する
- B. pass 維持 — `SENSOR_PASSED` + `tool-unavailable` を診断付き pass として扱う
- C. 条件付き — plugin/manifest ごとに blocking semantics を宣言できるようにする
- D. 監査のみ — gate は通すが、別の監視・通知で扱う
- E. 未決 — requirements では決めず design stage に延期する
- X. Other（具体的に記載）

[Answer]: A（E-OC1 AUTO_DECIDED：fail-closed。full autonomy の agent-recommendation basis、2026-08-18T09:35:00Z）

## Q2. dispatcher、guard、文書の契約境界

Q1 の fail-closed 方針に対して、既存 audit event の互換性と意味論文書をどう同期しますか。

- A. **schema 維持 + guard 拒否 + 三文書同期（推奨）** — `SENSOR_PASSED` + `Note: tool-unavailable` を維持し、guard の述語で拒否し、sensor schema / plugin sensor / audit-format に意味を明記する
- B. dispatcher 変更 — exit 127 を `SENSOR_FAILED` に分類し、guard と文書を既存 terminal semantics に合わせる
- C. 部分同期 — guard のみ変更し、event schema または文書は後続へ延期する
- D. 未決 — design stage に延期する
- X. Other（具体的に記載）

[Answer]: A（E-OC1 AUTO_DECIDED：Q2 audit schema 維持・guard で拒否 + Q4 三文書同期。full autonomy の agent-recommendation basis、2026-08-18T09:35:00Z）

## Q3. 回帰テストの受け入れ範囲

修正の最低限の回帰証拠をどこまで要求しますか。

- A. **unit + integration + dispatcher（推奨）** — t511 unit、t511 integration、t92 の exit 127 分類をすべて更新・実行する
- B. unit + integration — t92 は既存契約として維持し、t511 の gate を中心に更新する
- C. integration のみ — 実際の approve path だけを受け入れ基準にする
- D. 文書のみ — pass 維持を選んだ場合はテストを変更しない
- E. 未決 — code-generation/build-and-test で決める
- X. Other（具体的に記載）

[Answer]: A（E-OC1 AUTO_DECIDED：unit + integration + dispatcher。full autonomy の agent-recommendation basis、2026-08-18T09:35:00Z）

## Q4. 変更面と完了条件

実装時の許可変更面と、Issue #3029 の修正完了条件をまとめて確定します。

- A. **確定済み最小面 + gate/テスト/文書同期（推奨）** — 許可面だけを変更し、exit 127 が素通りせず、関連テストと文書が同期したら完了とする
- B. 最小面 + 関連 core コメントと stage protocol も変更し、unit evaluator の fail-closed だけで完了とする
- C. 最小面 + graph severity carriage を再設計し、production sensor の refusal 実行証跡で完了とする
- D. 変更面を制限せず、PR convergence で完了を判定する
- X. Other（具体的に記載）

[Answer]: A（E-OC1 AUTO_DECIDED：Q5 確定済み最小面 + Q6 gate 素通り防止・関連テスト・文書同期。full autonomy の agent-recommendation basis、2026-08-18T09:35:00Z）
