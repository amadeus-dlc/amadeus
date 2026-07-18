# Performance Requirements — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- PNR-D1: dist/self-install 再生成は既存 `package.ts` / `promote:self` の実行時間内(新規生成ステップを追加しない — `business-logic-model.md` の生成経路単一。受け入れ = 生成コマンド列が既存 2 コマンドのまま)

## 検証

- 実行時性能は非該当(文書・生成物のみの unit — ランタイムコードを含まない)— 根拠付き N/A
