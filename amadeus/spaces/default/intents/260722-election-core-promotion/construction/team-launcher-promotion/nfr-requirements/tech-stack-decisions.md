# Tech Stack Decisions — team-launcher-promotion

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 技術スタック決定

- **bash 維持**(requirements FR-3a = RA Q2 ユーザー裁定): TS 化しない。technology-stack の現行スタック(チーム系 = bash+外部 herdr/Ghostty/mise)を不変搬送
- doctor advisory 検出関数のみ TypeScript(business-logic-model の detectTeamPrerequisites — 既存 amadeus-utility.ts への追加で新規ファイル・新規依存なし)
- 新規依存ゼロ(Bun-only Forbidden 維持 — herdr/agmsg は PATH 前提の外部 prerequisite のまま)

## 決定事項

- business-rules BR-7 の整合テスト(bash/doctor の prerequisite 集合一致 assert — BR-7 セル逐語「code-generation 段で両定義の集合一致を assert する軽量整合テストを追加する」)を code-generation 段で新設する。テスト層は本決定で unit と確定(判定 = 純関数比較 — fs-tests-integration-first 基準。FD は整合テストの存在を確定済み・層は未特定で、割付節の旧文言「レビュー+docs ガード」は FD 側で同期是正済み)。新規テスト番号は実装時に予約(swarm-test-number-reservation)
- 配置は packages/framework/core/tools/(AD ADR-2 — 全6 dist 投影は既存機構)
