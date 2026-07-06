# Build and Test Results

Unit: docs-lang-guide
実施日: 2026-07-06（UTC）
実施環境: engineer3 worktree（branch: eng3/issue-509-532-docs、基点 origin/main = 2a0a784b）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| repo 標準検証 | `npm run test:all`（typecheck / lints / contracts / parity / wiring / evals 29 種 / engine-e2e / diff） | pass（exit 0） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-lang-guide` | pass |
| 文書内容検証 | reviewer（amadeus-architecture-reviewer-agent）iteration 2 | READY |

## 特記事項

- validator 初回 fail（Per unit: [TBD]）は既知事象（Corrections c2）で、実 unit 名への更新で解消した。
- reviewer iteration 1 が「22 stage definitions」という未検証数値を検出し、実測 32 + アンカー付きへ英日両版で修正した（Grounding 検査の実効例）。
- workspace_requires ガードは docs/ への書き込みが source work として数えられるため自然に通過見込み（HARNESS_DOC_DIRS 実測、requirements C-3 訂正）。declare-docs-only は使用しない。
