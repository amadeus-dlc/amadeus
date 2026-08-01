# Security Design — U11: otlp-relay

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の目標（認証なしローカル Collector 前提・接続先限定・送信内容の写像限定・diagnostics の節度）に対する設計。

## 接続先と認証の設計

- OTLP exporter は auth header なしのローカル Collector（loopback）のみを前提とする。認証トークンの設定・送信機構を持たず、外部エンドポイントへの既定送信を持たない（NFR-4、BR-4）
- 認証必要構成は後続 Phase の拡張に委ね初期スコープ外とする（requirements.md Out of Scope）。拡張を見越した設定フィールドを予約しない
- auth header を送出しないことを fixture で検証する（NFR-4 のテスト固定、同一コミット red-green、BR-15）

## 送信内容の設計

- OTLP payload は Local Signal Store record の写像のみ。audit JSONL（Journal）を入力に含めない（FR-RLY-2、BR-1）。Span の推測・合成・時刻包含・ID 生成・timing event 合成は一切行わない（FR-RLY-1）
- credential・prompt・argv 由来値は export 境界の redaction policy（U4）で除去済みの値のみを転送する（FR-DST-3、VER-2）

## diagnostics の節度設計

- 送信失敗の診断記録に HTTP レスポンス body・ヘッダをそのまま含めず、ステータスコードとエラー種別のみを記録する（BR-10）
- telemetry 成果物の credential-free 検査ゲート（VER-2）に Relay の diagnostics 出力を含める
