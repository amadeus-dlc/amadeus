# Security Test Instructions — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-summary.md` — 変更が `watcher_verification_applies` 内の分岐追加と stderr 出力に限定され、認証情報・外部入力・権限境界に触れないことを引いた。
- `code-generation-plan.md` — 変更ファイル一覧（シェルスクリプト11コピー + テスト2件）を引き、攻撃面の棚卸し対象を確定した。

## 攻撃面の棚卸し（実測）

`cid:build-and-test:c1` / `c3` に従い、戦略名で機械的に検査を追加せず、**実在する攻撃面と承認済み NFR へトレースして比例的に選定**する。

| 面 | 本変更での該当 | 判定 |
| --- | --- | --- |
| 認証情報・シークレット | 追加・参照なし | N/A |
| 外部入力の解析 | `CASE` 判定の入力は `CLAUDE_MONITOR_PROMPT`（スクリプト内の定数、外部から与えられない） | N/A |
| コマンド注入 | 新規のコマンド構築・展開なし。追加したのは `case` 分岐と `echo` のみ | N/A |
| 権限・認可のバイパス | 該当なし。本変更は**検証を実行しない**方向だが、対象の検証は導入以来一度も成功しておらず、セキュリティ境界ではなく起動時の可用性検査である | 下記参照 |
| ファイル書込・パス操作 | 追加なし。既存の sentinel 削除経路（`clear_stale_watcher_sentinels`）はガードにより非実行になるのみで、削除範囲は不変 | N/A |
| 依存の追加 | なし | N/A |

## 「検証をスキップする」変更のセキュリティ評価

本変更は検証ゲートを既定で無効化するため、形式上は「チェックを外す」変更に見える。以下により安全と判定する。

1. 対象の `verify_watchers_armed` は agmsg の actas モード専用 sentinel を待つ実装で、team-up.sh の monitor モード起動では**構造的に一度も成功しない**（`watch.sh:307` の書込は `:300` の `ACTIVE_NAME` 非空ガード内、`delivery.sh:301` は位置引数3個しか渡さない）。実測: agmsg run ディレクトリ 251エントリ中 `ready.*` は 0件。
2. したがって除去されるのは「実在した保護」ではなく、**常に失敗する検査**である。`org.md` Forbidden の検証劇場（偽の信頼を生む検査）に該当していた状態の解消にあたる。
3. スキップは無言でなく、理由と参照 Issue を stderr へ明示する（FR-2）。no-silent-success を満たす。
4. 検証ロジック本体は存置され（FR-5）、#1476 で初期プロンプトを actas へ移行した時点でガードが自動的に真を返して再有効化される。
5. 誤判定した場合の副作用は「検証が有効化されない」だけで、安全側に倒れる（§12a reviewer が独立確認）。

## 実行した検査

| 検査 | 結果 |
| --- | --- |
| `bun run lint`（Biome） | exit 0 |
| `bun run typecheck` | exit 0 |
| `bash tests/run-tests.sh --ci` | exit 0（546ファイル / 7,565 assertion / 失敗 0） |

リポジトリ全体の依存監査（`bun audit` 等）は本変更の対象面（依存追加なし）と無関係のため実施しない（`cid:build-and-test:c1-doctor-seam` — 対象変更のセキュリティ回帰と repository 全体の依存監査を別判定にする）。
