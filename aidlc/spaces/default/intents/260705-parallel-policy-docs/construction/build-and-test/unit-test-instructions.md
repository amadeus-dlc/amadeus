# Unit Test Instructions

Unit: parallel-policy-docs（Test Strategy: Minimal — 要件 1 件につき検証 1 件以上）

## 要件と検証の対応

| 要件 | 検証 | 方法 |
|---|---|---|
| R001/R006（AC-1: 5 項目対応表） | team.md 新節「worktree の階層と Bolt 実行契約」の対応表と各記述・実装参照の実在 | reviewer が確認済み（code-summary の Review）＋ PR レビュー |
| R002/R003（AC-2） | memory/phases/construction.md「Bolt 運用」節の存在 | ファイル実在＋節見出し確認 |
| R004（AC-3: 実例 4 行） | 根拠表の 4 行と参照 Issue/PR の実在 | reviewer が gh で全件確認済み |
| R005 | issue-disposition.md の 3 値判定表 | ファイル実在＋PR 説明への要約転記 |
| N002/N003 | 標準検証と構造検証 | `npm run test:all`、`AmadeusValidator . 260705-parallel-policy-docs` |

## 実行方法

```sh
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-parallel-policy-docs
```

## カバレッジ目標

- R001〜R006 の全要件に検証があり、文書の事実主張（実装済み参照）は reviewer のファクトチェックで担保する（Minimal 戦略の下限充足）。
