# Security Design — U4: local-exporters

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（二層 redaction 本番化・VER-2 ゲート配線・監査完全性）に対する設計。

## 二層 redaction の設計

- write-time 層は Logger Provider の emit 時に attrs へ適用し、export 境界層は各 Exporter の append 直前に適用する。RedactionPolicy は U1 が確立した単一インスタンスを両層で共有し、層ごとのポリシー分裂を防ぐ（BR-9、FR-DST-3）
- `command` 属性は safe-key から見直し対象とし、argv 由来値にトークン・credential 類が混入しないポリシーを適用。argv 文字列の raw 保存を型・ポリシーの双方で許さない（BR-11、FR-DST-4）
- `redactionOptIn` は限定キーの許可リスト＋必須の値スクラブ（パターン検出によるマスク）。opt-in キーであっても raw 値の素通し経路を作らない（BR-12、FR-DST-5）
- 二層それぞれについて機微情報が Store に残らないことをテストで証明する（business-logic-model.md § 検証フロー 4）

## credential-free ゲートの設計（VER-2、BR-15/16）

- 検査スキャン（U1 原型の本番化）は audit JSONL・Completed Span Store・diagnostic Log Store・Metric Store の実データを走査対象とし、credential 検出時はゲート fail とする
- CI ゲートとして配線し本 Unit の完了条件に含める。検査パターンの語彙源は redaction policy（FR-DST-3/4/5）と同一に揃え、二重管理を防ぐ（BR-16）

## 監査完全性の設計

- AuditLogExporter はネットワーク通信・Collector 依存を持たず、機微情報の外部流出経路を構造的に作らない（BR-1、FR-EXP-2）
- fatal latch は process-local の値として外部からの改ざん経路を持たない（FR-EVT-4）
