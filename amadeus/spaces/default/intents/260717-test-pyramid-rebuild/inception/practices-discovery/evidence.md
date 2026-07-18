# Practices Discovery — Evidence(260717-test-pyramid-rebuild、#684)

上流入力(consumes 全数): codekb `code-structure.md`・`technology-stack.md`・`dependencies.md`・`code-quality-assessment.md`・`architecture.md`・`business-overview.md`(同日 RE で現況化済みの6点を証跡スキャンとして代用 — practices-discovery:c1)

## 証跡スキャンの代用宣言(c1)

本 intent の reverse-engineering(2026-07-17、決定的分類スイープ)がテスト基盤面のスキャンをカバー済みのため独立スキャンは行わず codekb を代用:

- **テスト面**: classifyTestSize・test_pyramid コレクタ・size ドリフトゲート・run-tests.sh を RE で実測(code-structure テスト分類面)
- **CI 面**: 既存 CI(typecheck/lint/dist:check/promote:self:check/--ci)は本日の複数 intent で実測済み
- **コードスタイル面**: 既習様式(exported 純関数・in-process seam・decisive rubric）を RE で実測
- **セキュリティ面**: 対象は自リポジトリのテスト分類・文書化のみ(実移設は Out）

## affirmed 済み team.md / project.md との差分ギャップ

**ギャップなし(0件)** — 実測根拠:
1. memory 層は本日 #1150 ほかの着地まで読了 ack 済みで最新
2. 本 intent の作業様式(計測導出・グリーン維持・検証劇場禁止・fan-out/決定的スイープ判断)はすべて既存の Testing Posture / Forbidden / subagent-utilization でカバー
3. 決定的スイープ論(E-TPR-RE C1)は本 intent の §13 で採用済みで、practices 昇格でなく leader のノルム PR で persist される
