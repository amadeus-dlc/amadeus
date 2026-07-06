# Build and Test Results

Unit: docs-codekb-guards
実施日: 2026-07-05（UTC）
実施環境: engineer3 worktree（branch: eng3/issue-498-499-501-bugfix、基点 origin/main = 27e2dcca 追従済み）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `npm run typecheck` | pass（エラーなし） |
| 専用 eval | `npm run test:it:docs-codekb-guards` | pass（24 検査すべて ok） |
| エンジン sandbox e2e | `npm run test:it:engine-e2e` | pass（20 検査 ok） |
| validator eval | `npm run test:it:amadeus-validator` / `test:it:amadeus-validator-domain` | pass |
| 昇格同期 | `npm run test:it:promote-skill` | pass |
| parity | `npm run parity:check` | pass（38 skills、197 engine files） |
| repo 標準検証 | `npm run test:all` | pass（exit 0） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-docs-codekb-guards` | pass |

## TDD 証跡（RED → GREEN）

- B001: 修正前に FR-1.1 系 2 検査が FAIL（repo キーが `wt-engineerX` に漏れる）→ 修正後 GREEN。
- B002: 遡及 RED 検証。実装 2 ファイル（amadeus-state.ts、amadeus-lib.ts）を stash した状態で B002 系 5 検査が FAIL → 復元後 GREEN。reviewer 指摘反映後の追加 4 検査（evidence 形式・実在・registry 汚染なし・不一致行拒否）も追加時点で FAIL → 実装後 GREEN。
- B003: 実装前は dangling 参照の stub でも validator が exit 0（FAIL）→ 実装後は fail 行 + 非ゼロ終了で GREEN。

## reviewer

- iteration 1: NOT-READY（Finding 4 件）。
- iteration 2: READY（全 Finding の解消または非変更判断の妥当性を確認。`test:it:all` と engine-e2e の再実行を含む）。
