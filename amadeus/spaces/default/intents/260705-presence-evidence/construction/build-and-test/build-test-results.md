# Build / Test Results

Unit: u001-presence-evidence（feature scope、docs 変更）

## 実行結果

| 検証 | コマンド | 結果 | 実行時刻（UTC） |
|---|---|---|---|
| 標準検証（反映直後） | `npm run test:all` | pass（exit 0、パイプなし実行。typecheck、lint:check、contracts:check、parity:check、claude-wiring:check、grilling-wiring:check、issue-ref-contract:check、test:it:all、test:it:engine-e2e、diff:check の全段通過） | 2026-07-06T01:55 頃 |
| 標準検証（§12a 指摘 1 のフェンス修正後に再実行） | `npm run test:all` | pass（exit 0、パイプなし実行。全段通過） | 2026-07-06T02:15 頃 |
| parity 単独 | `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c3 = PR #542 merge 後） | 2026-07-06T01:55 頃 |
| 構造検証（Intent 指定） | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-presence-evidence` | 本 Intent の変更対象への指摘なし。「不足または矛盾」は Operation ステージ表記と reverse-engineering の produces 表記のみ（後述） | 2026-07-06T02:14 頃（build-and-test 成果物作成後に再実行） |

## 注記

- validator の Operation ステージ表記の指摘は、feature scope が Operation ステージ（4.1〜4.7）を EXECUTE として持つ一方、steering（memory/phases/operation.md）が default space の Operation を対象外と規定していることによる既知の表記整合パターンである。build-and-test 完了後、Operation ステージ到達時に理由付き skip（[S]）で閉じることで解消する（前例: 260705-engine-installer）。
- validator の reverse-engineering produces 不在の指摘（9 件）は、codekb 採用（#498 修正 = PR #505/#539 以降、produces は record ではなく `codekb/amadeus/` へ解決される）による既知の表記である。実体は `aidlc/spaces/default/codekb/amadeus/` に 9 ファイルすべて存在することを確認済み。validator 側の解決規則追従は本 Intent のスコープ外（validator 変更を混ぜない粒度制約）であり、後続課題として PR 説明に記載する。
- §12a review 反復 1 が検出した audit-format.md への孤立フェンス混入は、test:all / validator では検出できない欠陥だった（Markdown フェンス対応は検査対象外）。復旧と復旧後のフェンス数確認（6 個 = origin/main と同数）は [code-summary.md](../u001-presence-evidence/code-generation/code-summary.md) の「§12a review の指摘と修正」を参照。
- 反映直後の実行記録は [code-summary.md](../u001-presence-evidence/code-generation/code-summary.md) の「反映と検証の記録」と一致する。§12a 指摘 1 の孤立フェンス削除は反映後の唯一の出荷対象変更であるため、削除後に `npm run test:all` を再実行し、fresh な exit 0 を本ステージの正とした（上表 2 行目）。
