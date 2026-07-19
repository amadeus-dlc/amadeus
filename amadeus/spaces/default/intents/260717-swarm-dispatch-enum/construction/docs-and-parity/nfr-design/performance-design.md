# Performance Design — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- PD-D1(PNR-D1): 生成は既存 2 コマンド(`bun scripts/package.ts` → `bun run promote:self`)の順次実行のみ — 新規生成ステップ・並列化を導入しない(`business-logic-model.md` 生成物同期節の直写像)

## 保証機構(層別)

- 手順層: Bolt 3 の実行手順に 2 コマンドを明記(それ以外の生成手段を書かない)
- 検査層: dist:check / promote:self:check が再現性を機械保証(既存)
