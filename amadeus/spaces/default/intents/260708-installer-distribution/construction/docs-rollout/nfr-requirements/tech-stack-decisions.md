# Tech Stack Decisions — docs-rollout

> ステージ: nfr-requirements (3.2) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../functional-design/domain-entities.md`(新規型なし宣言)・`business-logic-model.md`、U1 tech-stack-decisions

## 新規技術の不採用宣言

docs(Markdown)とメタデータ(JSON)+`packages/framework/core/tools/amadeus-version.ts` のバンプのみ。ツールは既存の t68(bun:test)・grep・**`scripts/package.ts`(dist 再生成)/`promote-self.ts`(セルフインストール昇格)とその check モード**。新規の技術・依存・ジェネレータを導入しない。README に記載する Node フロアは U1 の権威記述(≥18.3)を転記する。
