# Unit Test Instructions — Amadeus Grilling 統合

## 対象テスト

- **t199-grilling-distribution.test.ts(新設)**: `bun test tests/unit/t199-grilling-distribution.test.ts`
  - 4 dist へのスキル配布(claude/kiro/kiro-ide: `skills/amadeus-grilling/`、codex: `.agents/skills/amadeus-grilling/`)
  - grilling-protocol.md の4 dist 配布
  - stage-protocol.md モード選択ブロックの Grill me 存在
  - SKILL.md frontmatter の `classification: read-only`
  - MIT 帰属(URL+ライセンス名)の存在 — FR-4.1 合否基準
- **t68-version-changelog-sync**: バンプ3点セット(1.1.0)の同期
- **t123(unit/smoke)/ t150**: スキル数の期待値更新(4→5、codex 40)の整合

## 実行

`bun test tests/unit/t199-grilling-distribution.test.ts tests/unit/t68-version-changelog-sync.test.ts` — いずれも全パスであること。
