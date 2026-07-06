# Build and Test Results

Unit: docs-i18n
実施日: 2026-07-06（UTC）
実施環境: engineer5 worktree（branch: eng5/issue-521-523-docs-i18n、基点 origin/main = 29f3122c = PR #559 merge 後）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all` | pass（exit 0、ok 636 件） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-i18n` | pass |
| 日本語残存（8 英語版） | `grep -P '[ぁ-んァ-ヶ一-龠]'` | 0 件 |
| H2 対一致（8 対） | 見出し数比較 | 全対一致（7 / 8 / 6 / 5 / 7 / 8 / 8 / 8） |
| リンク解決の機械検査（NFR-3） | scratchpad の一時スクリプト（対象 16 + 参照元 4） | checked=106 broken=0 |
| 対訳パリティ・実体一致 | stage reviewer（amadeus-architecture-reviewer-agent）iteration 2 | READY |
| 初見読者レビュー（NFR-1） | reviewer（Codex / GPT-5.5） | High 3 + Low 3 → 全件対応で合格 |

## 特記事項

- 変更範囲は docs/amadeus 直下 8 対（16 ファイル）+ 参照元 3 ファイル（README.ja.md、language-policy.ja.md、extension-guide.ja.md）の計 19 ファイルに閉じる（C-1。reviewer が git diff で確認）。
- 途中 2 回の main 追従（PR #559 前後）で codekb timestamp / intents.json の追記衝突を時系列 union で解消した。
