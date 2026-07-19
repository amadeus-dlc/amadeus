# Code Generation Plan — election-store(Bolt 1 核+Bolt 3 完全化)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## スコープ分割(bolt-plan.md どおり)

- Bolt 1(walking-skeleton): create/load/setState/appendBallot(通常経路)/status/materialize/appendTimeline+writeStoreFile(tmp+rename 単一経路 — reliability-design.md の 2 assert 対)+StoreError 5 kind(corrupt 含む — domain-entities.md)
- Bolt 3(io-record-transport): 後着レーン(business-logic-model.md の state 分岐 — U1 classifyLate 呼出+reexamRequired 永続)、amend 共存(ADR-5 — requirements.md FR-3b の明示再提出)、duplicate 検査の late 区画跨ぎ(全期間適用)

## 実装順序と検証

Bolt 1: レイアウト+atomic ヘルパー → verb 群 → t235 integration(実 FS — unit-of-work.md の層宣言)。Bolt 3: PR #1231(classifyLate)着地後に worktree へ main 取込 → 後着レーン → t235 拡張(amend 共存・後着2ケース・跨ぎ duplicate)→ 全検証再実行。実装制約: 追記は O(1)+全量書き戻しの単一経路(performance-design.md)、パス構成は選挙 ID 配下の3要素関数に閉じる(security-design.md の書込境界)
