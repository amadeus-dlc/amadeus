# Tech Stack Decisions — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 決定

- TSD-D1: 新規ツールゼロ — 生成は既存 `bun scripts/package.ts` と `bun run promote:self`(`technology-stack.md` の既存構成)のみ
- TSD-D2: docs は手書き正本(docs/ と正本知識ファイル)、dist/self-install は生成物 — 書き分けは `business-rules.md` BR-D5/BR-D6 の走査範囲どおり
- TSD-D3: 対訳(.ja.md)は同一 PR 同期(docs-language-ownership 承継)

## 検証

- NFR-6 適用対象(既存 CI gate — dist:check/promote:self:check/docs gate — の green 維持で充足)。新規ツールチェーン導入判断のみ N/A
