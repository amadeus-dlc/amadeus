# Reliability Requirements — U7: callsite-migration

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| rollback 手段 | batch 単位で git revert＋変換前 backup 復元により完全に変換前状態へ戻せる。部分適用のまま放置しない（BR-5）。backup 不在の batch 変換は禁止 | 各 batch commit に対し revert 手順が存在し、backup 取得が変換前の必須手順として記録されること |
| 移行正しさの検証 | 新旧経路の shadow 比較で event count・linkage・status・許可属性が同等以上、機械可読 report に未説明差分なし。差分がある限り旧実装削除の入力 FR-MIG-4(d) は未充足（BR-10） | shadow 比較ハーネス（U1 原型の本番化）の report を削除ゲート入力として U8 へ引き渡す |
| 失敗契約の同一性 | Adapter 経由の emit は直接経路と同一の失敗契約。書き込み失敗の同期例外と fatal latch set を Adapter が握りつぶさない（BR-4） | 失敗契約テスト（red 先行）で Adapter 経由・直接経由の例外伝播を同一に検証（VER-3 準拠） |
| canonical 経路の単一性 | 移行期間中を含め canonical 書き込み経路は常に単一（Event API → AuditLogExporter）。恒久 dual-write/dual-read を持たない（BR-1/BR-6） | Adapter 内部に旧 writer 呼出し経路がないことを実装レビューと guard で固定 |

## 制約

- guard の誤検出（false positive で正しい移行 commit を拒否）は許容して修正するが、見逃し（false negative で allowlist 外の直接呼出しを通す）は許容しない。検査は保守側（過検出方向）に倒す
- 各 batch の書換えはテスト同一コミットの red-green で実施し、変換後に残存 site 数の単調減少を確認する（BR-12）
- shadow 比較ハーネスは U1（otel-walking-skeleton）の原型を本番化し、新規自作しない。harness 自体の障害は比較未実施として report に顕在化させ、暗黙の「同等」扱いを禁止する
