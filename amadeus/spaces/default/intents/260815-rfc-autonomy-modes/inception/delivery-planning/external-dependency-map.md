# External Dependency Map — intent 260815-rfc-autonomy-modes

- 外部サービス依存: なし(デプロイ基盤なし。GitHub Actions CI と gh CLI のみ — 既存運用どおり optional・loud fail)。
- 外部人間依存: PR マージは常任承認ノルム条件下で AI 実行(queue 経由)。walking-skeleton ゲート(Bolt 1)のみ人間承認(semi/full でも WS は人間 — 現行意味論。※本 intent が実装する新意味論は着地後の intent から適用)。
- 上流依存: RFC-0001(approved・凍結)。選挙 record(terminal)。追加裁定が必要になった場合のみ選挙/ユーザー。
