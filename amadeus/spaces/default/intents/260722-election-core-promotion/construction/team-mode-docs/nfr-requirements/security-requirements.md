# Security Requirements — team-mode-docs

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## セキュリティ要件

- 参照する外部 URL は公式入手先3種のみ(business-rules BR-2 / business-logic-model の Prerequisites 節 — herdr.dev / agmsg 公式 / bun.sh。requirements FR-7c の合否基準)— 非公式ミラー・短縮 URL を掲載しない
- 秘密情報・トークン・内部パスの掲載なし(docs は配布コピーの公開パス {{HARNESS_DIR}} 形のみ — technology-stack の配布面と一致)

## 検証

- 追加検査なし(N/A 根拠: 攻撃面なし — build-and-test:c3。URL の公式性は PR レビュー観点)
