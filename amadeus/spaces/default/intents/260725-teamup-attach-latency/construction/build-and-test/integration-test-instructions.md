# Integration Test Instructions — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-summary.md` — 新規テスト `t294` の7ケースと、既存 `t-team-up-watcher-arming.test.ts` への適用可否ケース修正（NFR-2 が明示的に許容する形）を引いた。
- `code-generation-plan.md` — FR-1〜FR-5 の受け入れ基準を引き、各ケースの対応関係を確定した。

## 新規テスト

`tests/integration/t294-team-up-watcher-applicability.test.ts`（7テスト、19 expect）。既存シーム `TEAM_UP_LIB_ONLY=1` で正本を source し、実チーム起動は行わない（重い実待機テストは追加しない — Q2 裁定 A / NFR-3）。

| # | 検証内容 | 対応要件 |
| --- | --- | --- |
| 1 | 既定 monitor プロンプトで適用されない | FR-1 |
| 2 | 出荷 `CLAUDE_MONITOR_PROMPT` が monitor 形であること（判定入力の実測固定） | FR-1 |
| 3 | actas プロンプトで適用される | FR-1（#1476 前進経路） |
| 4 | actas でも codex / herdr では適用されない（3組合せ） | FR-1 非退行 |
| 5 | スキップ通知が stderr へちょうど1回、stdout へ0（2回呼び出しで実測） | FR-2 |
| 6 | 適用経路では通知が出ない | FR-2 非退行 |
| 7 | FR-5 の4関数が `declare -F` で存在し、2定数が `90` / `1` に解決 | FR-5 |

テスト番号 294 は既存最大 293 の実測確認のうえ採番（`cid:code-generation:swarm-test-number-reservation`）。

## 既存テストの非退行（NFR-2）

`tests/integration/t-team-up-watcher-arming.test.ts`（268行）は agmsg をスタブし sentinel をテスト自身が書く構造。この構造の是正は #1476 の範囲。本変更では適用可否ケース（`:193-208`）へ `CLAUDE_MONITOR_PROMPT='/agmsg actas leader'` を設定して runtime/backend 軸の検証意図を保存した（他テスト本体は未変更）。

## 実測結果

| 対象 | 結果 |
| --- | --- |
| `t294-team-up-watcher-applicability.test.ts` | 7 pass / 0 fail（19 expect） |
| `t-team-up-watcher-arming.test.ts` | 11 pass / 0 fail（47 expect） |
| `bash tests/run-tests.sh --ci` | exit 0、546ファイル / 7,565 assertion / 失敗 0 |

conductor が独立に再実行して確認済み。
