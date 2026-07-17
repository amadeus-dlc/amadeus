# Code Generation Plan — amadeus-mirror-cli(Bolt 1 = walking skeleton)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、security-design.md、unit-of-work.md、requirements.md — 本文の各節が依拠箇所を明記する。

## 実装目録

| ファイル | 内容 | 依拠 |
|---|---|---|
| scripts/amadeus-mirror.ts | C1 parseArgs / C2 countStageProgress+buildSnapshot / C3 renderTitle・renderStatusLine・renderBody / C4 spawnGh・ensureGhReady(GhRunner port)/ C5 handleCreate・handleSync・handleClose / C6 main | component-methods.md のシグネチャ、business-logic-model.md の決定木(error 分岐→重複ガード→ensureGhReady→本処理)、security-design.md S-1〜S-4 |
| tests/unit/t232-amadeus-mirror.test.ts | 純関数(C1/集計/C3)— 実 FS なし | business-rules.md R1/R6、fs-tests-integration-first |
| tests/integration/t232-amadeus-mirror.integration.test.ts | handler を fake GhRunner+一時 FS fixture で駆動 | requirements.md FR-2.2/3.2/3.3/4.1/1.3、reliability R-3 |

## 実装時裁定(逸脱の宣言と閉包)

- **ADR-3a(ユーザー承認 2026-07-17)**: 状態行の approved/total は summary --json でなく対象 intent の state.md「Stage Progress」チェックボックス集計へ変更([S] は分母除外)。設計 C2 の3ソース合成は state.md+intents.json の2ソースへ簡素化 — inception/application-design/decisions.md に ADR-3a として追記済み
