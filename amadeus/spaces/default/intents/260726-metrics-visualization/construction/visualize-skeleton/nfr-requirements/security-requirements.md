# Security Requirements — U1 visualize-skeleton

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## セキュリティ要件

- U1-SEC-01: ネットワーク I/O ゼロ(requirements.md FR-3 self-contained、business-rules.md ルール9)。出力 HTML に http/https 参照が無いことを unit テストで assert
- U1-SEC-02: 動的文字列は全数 escapeHtml 経由(business-rules.md ルール5)。入力(metrics/*.json)は信頼境界内(自 repo・CI 生成物)だが、書式健全性として全数エスケープを維持
- U1-SEC-03: 秘密情報の取り扱いなし(入力はコード品質メトリクスのみ)。環境変数は AMADEUS_METRICS_ROOT(パス)のみ消費し、値を HTML へ埋め込まない(決定性ルール11 と同根)

## 非対象

- 認証・認可(ローカル file:// 閲覧のみ)、依存監査の新設(依存追加ゼロ — technology-stack.md)
