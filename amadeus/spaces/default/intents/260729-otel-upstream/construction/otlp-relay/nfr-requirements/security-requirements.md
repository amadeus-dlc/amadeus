# Security Requirements — U11: otlp-relay

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 根拠 |
|---|---|---|
| 認証 | OTLP exporter は auth header なしのローカル Collector のみを前提とする。認証トークンの設定・送信機構を持たない。認証必要構成は後続 Phase の拡張に委ね初期スコープ外とする（NFR-4、BR-4） | requirements.md Out of Scope |
| 接続先 | 送信先は loopback のローカル Collector。外部エンドポイントへの既定送信を持たない | NFR-4 |
| 送信内容 | OTLP payload は Local Signal Store record の写像のみ。audit JSONL（Journal）を入力に含めない（FR-RLY-2、BR-1）。credential・prompt・argv 由来値は export 境界の redaction policy で除去される（FR-DST-3、VER-2） | FR-DST-3 |
| diagnostics | 送信失敗の診断記録に HTTP レスポンス body・ヘッダをそのまま含めず、ステータスコードとエラー種別のみを記録する | BR-10 |

## 検証

- telemetry 成果物（Signal Stores）の credential-free 検査ゲートに Relay の diagnostics 出力を含める（VER-2）
- auth header を送出しないことを fixture で検証する（NFR-4 のテスト固定、同一コミット red-green：BR-15）
