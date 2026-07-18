# Scalability Requirements — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SCR-D1: harness 追加時の docs 面コストは「ガイド1ファイル(.md/.ja.md 対)+08 節の表1列」に閉じる(`business-logic-model.md` 写像表の様式帰結)
- SCR-D2: 件数・列挙数を書いた doc コメントの新設を避け count-free を優先(count-comment-sync-on-catalog-change の順位付け承継。受け入れ = 変更 docs に新規の件数断定コメントなし)

## 検証

- NFR-3(並行性)は非該当 — 文書 unit に並行実行面なし — 根拠付き N/A
