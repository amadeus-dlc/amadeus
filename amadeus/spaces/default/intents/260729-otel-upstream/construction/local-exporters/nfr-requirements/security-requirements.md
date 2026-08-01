# Security Requirements — U4: local-exporters

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 二層 redaction の本番化（FR-DST-3/4/5）

- write-time（emit 時）と export 境界（append 直前）の二層で redaction を適用し、機微情報（prompt・argv・credential・無許可パス）は audit JSONL を含む全 Signal Store に流さない（BR-9）
- `command` 属性は safe-key から見直し対象とし、argv 由来値にトークン・credential 類が混入しないポリシーを適用。argv 文字列の raw 保存を禁止（BR-11、FR-DST-4）
- `redactionOptIn` は限定キーの許可リスト方式＋必須の値スクラブ。opt-in は raw 値の素通しを意味しない（BR-12、FR-DST-5）
- 二層それぞれについて、機微情報が Store に残らないことをテストで証明する（U1 の policy 最小形を本番語彙へ拡張）

## credential-free ゲートの配線（VER-2、BR-15/16）

- 検査対象は audit JSONL・Completed Span Store・diagnostic Log Store・Metric Store の全 telemetry 成果物。いずれかで credential 検出時はゲート fail
- 本 Unit の各 Exporter が出力する Store 実データを対象に CI ゲートとして配線し、本 Unit の完了条件に含める
- 検査パターンの語彙源は redaction policy（FR-DST-3/4/5）と同一に揃え、二重管理を防ぐ

## 監査の完全性

- fatal latch の set・参照は process-local で完結し、外部からの改ざん経路を持たない
- AuditLogExporter はネットワーク通信・Collector 依存を持たない（BR-1）。機微情報が外部へ流出する経路を構造的に作らない
