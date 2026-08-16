# Code Generation Plan — unit d6-investigation(FR-13 / RFC-0001 D6)

## 拘束
- ADR-11: 調査専用 — 修正・是正コードを書かない。発見欠陥は Issue draft として record に置き、起票はユーザー着手決定 + クロスレビュー 2 名成立が前提
- FD R-1〜R-3(business-rules.md): 実測のみ・一次記録は record・帰属切り分けは同一条件比較

## 手順(実施済み — swarm batch 1)
1. 現行コードの読解(orchestrate のゲート提示 / state の承認記録 / presence 検査 / 回復経路)
2. scratch fixture(repo 外、--project-dir override)での決定的再現
3. investigation-report.md へ 機序 / 一次証拠 / 再現手順 / 判定 / 帰属 / Issue draft を記録
