# Reliability Design — U7: callsite-migration

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の目標（rollback・移行正しさ・失敗契約同一性・canonical 経路単一性）に対する設計。

## rollback の設計

- rollback は batch 単位で git revert＋変換前 backup 復元により完全に変換前状態へ戻せる。backup 取得を変換前の必須手順とし、backup 不在の batch 変換を禁止する（BR-5）
- 部分適用のまま放置しない: batch 内の書換えは 1 commit で完結させ、中途状態の commit を分離しない

## 移行正しさの検証設計

- shadow 比較ハーネス（U1 原型の本番化、新規自作しない）で新旧経路の出力（event count・linkage・status・許可属性）を同一操作で採取し、機械可読 report を生成する（business-logic-model.md § shadow 比較ハーネス）
- report の未説明差分が残る限り FR-MIG-4(d) は未充足。harness 自体の障害は「比較未実施」として report に顕在化させ、暗黙の「同等」扱いを禁止する
- report は U8 へ引き渡す。本 Unit は harness と report 生成までを責務とし、ゲート判定は行わない

## 失敗契約の同一性設計

- Adapter 経由の emit は直接経路と同一の失敗契約とし、`emitEvent` の throw と fatal latch set を Adapter が握りつぶさない（BR-4）。Adapter 内に try/catch による例外吸収を置かない
- 失敗契約テスト（red 先行）で Adapter 経由・直接経由の例外伝播を同一に検証する（VER-3 準拠）

## canonical 経路の単一性設計

- 移行期間中を含め canonical 書込み経路は常に単一（Event API → AuditLogExporter）。Adapter 内部に旧 writer 呼出し経路がないことを実装レビューと guard で固定する（BR-1/BR-6、恒久 dual-write/dual-read 禁止）
- guard の検査は保守側（過検出方向）に倒す: false positive は許容して修正し、false negative（allowlist 外の直接呼出しの見逃し）は許容しない
