# Build Test Results：B002 skill 置換と整理

実行日時: 2026-07-03T19:0xZ（UTC）。branch claude/issue-396-inception。

| # | コマンド | 結果 |
|---|---|---|
| 1 | `npm run test:it:amadeus-templates` | exit 0 |
| 2 | `npm run test:it:promote-skill` | exit 0 |
| 3 | `npm run contracts:check` | exit 0 |
| 4 | `npm run claude-wiring:check` | exit 0 |
| 5 | `npm run diff:check` | exit 0 |
| 6 | `npm run test:e2e:ci:mock` | exit 0（steering / steering-rerun とも ok） |
| 7 | `npm run test:all` | exit 0（green） |

## 失敗と是正（同一 Bolt 内で完結）

1. contracts:check fail → カタログから削除 skill の entry を除去し再生成（typecheck の never 縮退は生成スクリプトの型注釈で解消）。
2. test:it:promote-skill fail → policyManagedInternalSkills から削除 skill を除去。
3. claude-wiring:check fail → `.claude/rules/aidlc.md` を symlink 規約に準拠（実体は `.agents/rules/`）。
4. diff:check fail → エンジンが書く audit shard の末尾空白を `.gitattributes` で検査対象外に（エンジン無改変契約）。
5. test:it:amadeus-templates ほか fail → 削除 skill の fixture 除去と、新入口（forwarding loop 版）への期待値更新。

いずれも削除と置換に対する検証コードの追随であり、想定外の退行ではないため halt-and-ask の対象にしなかった。
