# Scalability Requirements — U1 visualize-skeleton

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## スケーラビリティ要件

- U1-SCALE-01: データ量の上限は retention(360件 — metrics-retention.ts:25 METRICS_RETENTION_KEEP_LAST、requirements.md FR-6)が既に保証 — 可視化側は上限内の全量処理のみ設計する。horizontal scaling・分割生成は導入しない(nfr-design:c1)
- U1-SCALE-02: コレクタ・キーの増加はデータ駆動(business-rules.md ルール6)で自動吸収 — スキーマ進化への構造的スケール(requirements.md FR-3)
- U1-SCALE-03: HTML サイズの明示上限は U2 の FR-6(サイズガード)で導入 — U1 では実測値(現行入力193KB)のみ記録し、出力サイズの見込み数値は置かない — サイズの数値契約は U2 の FR-6(MAX_HTML_BYTES 導出式)が唯一の定義(数値ガード・推定値の先行記載は二重化と derived-value-shows-formula 違反を招くため排除)

## 非対象

- シャーディング・ページング・仮想スクロール — 上限有界(360件)の単一ページで不要(過剰機構の禁止)
