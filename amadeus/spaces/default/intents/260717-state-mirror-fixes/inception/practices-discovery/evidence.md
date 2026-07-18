# Evidence — 260717-state-mirror-fixes(証跡スキャン)

上流入力(consumes 全数): code-structure.md、technology-stack.md、dependencies.md、code-quality-assessment.md、architecture.md、business-overview.md(codekb — 証跡スキャンは同日 RE の diff-refresh を代用、practices-discovery:c1)

## 証跡ソース(practices-discovery:c1 — 同日 RE の diff-refresh を代用)

- CI・テスト・コードスタイル・セキュリティの証跡面は、同日実施の RE(observed HEAD `591b6a2a`、base `6495e03a`、dist=126)の codekb(code-structure.md / technology-stack.md / dependencies.md / code-quality-assessment.md / architecture.md / business-overview.md)+ record の scan-notes.md がカバー
- 追加実測(本ステージ、HEAD `0065380a9`): lint/typecheck 配線 = biome.json:41(scripts/** + core/tools/** + harness/**)・tsconfig.json:19(scripts/*.ts)/ 対象テスト実在 = tests/unit/t232-amadeus-mirror.test.ts + tests/integration/t232-amadeus-mirror.integration.test.ts + sync-statusline 参照4ファイル(t01/t02/t29/t149)/ dist ツリー6種(claude, codex, cursor, kiro, kiro-ide, opencode)

## ギャップ判定

差分ギャップ 0 問 — 両修正の作業面(canonical 編集・dist 再生成・テスト層・ロック様式)はすべて affirm 済み team.md / project.md の既存ノルムと一致。新規外部依存・新規パッケージ・新規配布経路なし(dependencies.md 不変の RE 実測)。
