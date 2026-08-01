# Reliability Design — docs-sync(U4)

上流入力(consumes 全数): business-logic-model.md
- 宣言 consumes のうち performance/security/scalability/reliability-requirements と tech-stack-decisions は該当ステージが本スコープで SKIP のため設計どおり不在(consumes_absent expected)— 代替正本は requirements.md の NFR-1〜4。

- 信頼性面は docs の陳腐化防止(`business-logic-model.md` の同期規則 = 実装後記述・件数フリー・対訳同期)に接地する。

## 信頼性設計

- 陳腐化防止の3規則(BR-U4-1〜3)を運用面の信頼性設計として扱う — 型シグネチャの逐語コピー禁止(canonical 1定義)で将来の実装変更に対する docs の頑健性を確保。

## 検証形

- 対訳同期と参照整合はレビュー観点(docs-language-ownership)。専用の機械検査は新設しない。
