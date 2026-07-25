# Build & Test Summary — fix-1449-watcher-guard（Issue #1449）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-generation-plan.md` — 実装計画と変更面（正本1 + dist 6 + self-install 4 = 11コピー、テスト2件）を引き、検証の網羅範囲を確定した。
- `code-summary.md` — 実装内容（`watcher_verification_applies` への適用可否ガード追加）と実装者の検証申告を引き、conductor 独立再実行との照合を行った。

## 変更の要旨

`team-up.sh` の起動が毎回約200秒ブロックされていた。原因は `verify_watchers_armed` が待つ ready sentinel を、team-up.sh の起動形態（monitor モード）が**構造的に一度も生成しない**こと。sentinel を書くのは agmsg の actas モードの watcher だけである（`watch.sh:307`、ガード `:300` の `ACTIVE_NAME` 非空判定。`delivery.sh:301` は位置引数を3個しか渡さない）。

agmsg `spawn.sh:565-568` と同型の**適用可否ガード**を `watcher_verification_applies` へ移植し、起動プロンプトが actas watcher を arm する場合のみ検証するようにした。既定の monitor 構成では理由を stderr へ1行出してスキップする。検証ロジック本体は #1476（actas 移行）のため存置した。

## 成果

| | 修正前 | 修正後 |
| --- | --- | --- |
| アタッチ到達時間（3人構成、実 launch） | 200.85 秒 | **5.87 秒** |
| 終了コード | 1 | **0** |

## 検証サマリ

| 項目 | 結果 |
| --- | --- |
| `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` | すべて exit 0（conductor 独立再実行で照合済み） |
| `bash tests/run-tests.sh --ci` | exit 0 — 546ファイル / 7,565 assertion / 失敗 0 / RESULT: PASS |
| 新規 `t294-team-up-watcher-applicability.test.ts` | 7 pass / 0 fail |
| 既存 `t-team-up-watcher-arming.test.ts`（NFR-2 非退行） | 11 pass / 0 fail |
| 落ちる実証（NFR-1） | pre-fix 面で 5 pass / 2 fail → post-fix で 7 pass / 0 fail。実装者・reviewer が独立に2回再現 |
| §12a reviewer（`amadeus-architecture-reviewer-agent`） | **READY**、Critical 0 / Major 0 / Minor 0 |
| 配布同期（FR-6） | 正本 + dist 6面 + self-install 4面 = 11コピー一致 |

## 要件の充足

| 要件 | 充足根拠 |
| --- | --- |
| FR-1（適用可否ガード） | t294 ケース1・3・4（既定で偽 / actas で真 / codex・herdr で偽） |
| FR-2（stderr 1行、no-silent-success） | t294 ケース5・6（2回呼び出しで stderr ちょうど1回、stdout 0） |
| FR-3（ブロッキング解消） | ガードが偽 → `verify_watchers_armed` 未呼出。実 launch 5.87 秒で実証 |
| FR-4（exit 0） | `watcher_status` 初期値 0 のまま `exit`。実 launch で exit 0 を実測 |
| FR-5（検証機構の存置） | t294 ケース7（4関数の `declare -F` 存在確認、2定数が 90 / 1 に解決） |
| FR-6（配布同期） | `dist:check` / `promote:self:check` exit 0、reviewer が byte-identical を `diff` で個別確認 |
| NFR-1（落ちる実証） | 上記のとおり2者独立再現 |
| NFR-2（既存テスト非退行） | `--ci` 全緑、既存 watcher-arming テスト 11 pass |
| NFR-3（integration 層・番号非重複） | `tests/integration/t294-`、既存最大 293 の実測確認のうえ採番 |
| NFR-4（変更最小性） | 正本 diff は `watcher_verification_applies` と直上コメントに限定（reviewer 確認済み） |

## スコープ外として分離した事項

- **#1476**（新規起票、bug / P1 / S2-CRITICAL）: 初期プロンプトを `/agmsg actas <role>` へ移行し検証を本来の意図どおり機能させる根治策。あわせて `t-team-up-watcher-arming.test.ts` が sentinel をテスト自身で書いている構造（本欠陥が導入以来 CI で検出されなかった原因）の是正。
- **worktree 並列化**（Q2 裁定 A）: `create_run` の `git worktree add` 直列実行（実測 1.05 秒/個 × 7 ≒ 7.4 秒）。修正後の残余時間の支配項だが、`.git` 設定ロック競合の安全性検証を要するため別 Issue へ分離。

## 既知の非退行事項

`--ci` の wall-clock drift 1件（`t-codex-hooks-migration.test.ts`、35.02s）は本コミットが触れていないファイル（#1212 由来）の既存条件。`RESULT: PASS`。修正せず明示的にフラグする。
