# Security Design — U1 visualize-skeleton

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U1-SEC-01(self-contained)の実現: renderHtml が生成する文書に外部 URL を書く経路を持たない(テンプレートに定数として http 参照が存在しない)。unit テストが出力への `http://`/`https://` 非出現を grep assert(検証は実行結果由来 — 検証劇場禁止)
- U1-SEC-02(全数エスケープ)の実現: 動的値の埋め込みは escapeHtml を通る専用ヘルパ経由のみに集約(business-logic-model.md 描画ステップ)。テンプレートリテラルへの生値直挿しをレビュー観点で禁止
- U1-SEC-03(env 値の非埋め込み)の実現: AMADEUS_METRICS_ROOT はパス解決のみに使い、renderHtml へ渡すデータに含めない(reliability-requirements.md U1-REL-03 の決定性と同一機構)

## 非対象

- サンドボックス・CSP ヘッダ(file:// ローカル閲覧 — security-requirements.md 非対象)。tech-stack-decisions.md どおり依存追加なし
