# Logical Components — u4-conduit-parity

上流入力(consumes 全数): business-logic-model.md(フロー)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 論理構成(層別保証)

| 論理コンポーネント | 実体 | 保証機構 |
|---|---|---|
| Surface Discoverer | パリティテスト内の glob | 空集合 fail-closed(BR-U4-5) |
| Vocabulary Asserter | 面ごとの grep assert | 欠落の列挙出力(診断性) |
| Protocol Paragraph Asserter | semi × decide-question 共起 assert | :131/:135 整合の機械固定 |
| Conduit Documents | 8面+固定4面の文書群 | 実装記述の citation-semantics(BR-U4-2)— reviewer 突合 |

## テスト層配置

- パリティテストは実 FS の read を伴うため integration 層(fs-tests-integration-first)。unit allowlist を増やさない(c2-doctor-seam)
- 落ちる実証は正本面への一時注入(テストが読むのは正本 — injection-surface-verify)で行い、1セット完遂(BR-U4-6)
