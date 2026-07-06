# Build and Test Results

Unit: readme-refresh
実施日: 2026-07-06（UTC）
実施環境: engineer5 worktree（branch: eng5/issue-535-readme-refresh、基点 origin/main = 33c40271 = PR #542 merge 後）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all`（typecheck / lint / contracts / parity / wiring / evals / engine-e2e / diff） | pass（exit 0、ok 610 件） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-readme-refresh` | pass（fail 0、warning 0） |
| 退役語の残存検査 | grep（examples/、validate:all、amadeus-steering、amadeus-event-storming、amadeus-domain-grilling、amadeus-ideation-*、intents/intents.md、skill-forge、22 stages / 22 ステージ、mock-based） | 0 件 |
| リンク解決の機械検査（NFR-1） | scratchpad の一時スクリプト（相対パス実在 + 同一ファイル内アンカー解決。コミットしない） | checked=46 broken=0（修正前ベースライン: examples/ 4 件検出） |
| 文書内容検証 | reviewer（amadeus-architecture-reviewer-agent）iteration 2 | READY |

## 特記事項

- validator 初回 fail（reverse-engineering produces の record 内不在）は、前例 260706-docs-lang-guide と同じ参照台帳 stub 9 件（inception/reverse-engineering/、正本 = codekb/amadeus/）の作成で解消した（Issue #501 の codekb-adoption reference-stub 検査に整合）。
- `tsc: command not found` の初回 fail は worktree の依存未導入が原因で、`bun install` 後に全件 pass した。
- Per unit: [TBD] は functional-design 時点で実 unit 名 readme-refresh へ手動更新済み（Corrections c2 の既知事象）。
