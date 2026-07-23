# Unit Test Instructions

## 対象と準備

U1〜U4 の `code-generation-plan.md` / `code-summary.md` に対応する純粋ロジックを検証する。対象は mirror status、設定3層merge、skill契約、境界decision、Receipt parse/serialize/遷移である。各テストは独立fixtureを使用する。

## 実行

```bash
bun test tests/unit/t232-amadeus-mirror.test.ts tests/unit/t257-amadeus-mirror-config.test.ts tests/unit/t258-amadeus-mirror-skill.test.ts tests/unit/t265-engine-boundary.test.ts
```

Comprehensive方針として、happy path、invalid input、境界値、冪等性、fail-closed、固定commandを含める。公開分岐の実行行0-hitを残さず、意味のあるassertionを優先する。

## 合格基準

失敗0、予期しないskip 0、共有状態への依存0を必須とする。Receipt破損、unknown config key、自由文detail、二重回答が安全に拒否されることを確認する。
