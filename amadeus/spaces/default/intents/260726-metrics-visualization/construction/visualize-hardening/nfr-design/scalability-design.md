# Scalability Design — U2 visualize-hardening

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U2-SCALE-01(サイズ上限)の実現: MAX_HTML_BYTES = 16_384 × METRICS_RETENTION_KEEP_LAST × 2(business-logic-model.md 増分3)。retention import により KEEP_LAST 変更へ自動追随。判定は書込/比較の直前1箇所(reliability-requirements.md U2-REL-01 の fail-closed と同一地点)
- U2-SCALE-02(強調の固定列挙)の実現: 判定表を regressionClass 内の単一 switch/表引きに集約(business-logic-model.md 増分2)。未知キーは default で非強調 — コレクタ増加時も判定コード不変

## 非対象

- 閾値の設定ファイル化・環境変数化(scalability-requirements.md 非対象 — named constant+導出式が唯一の定義。performance-requirements.md/security-requirements.md/tech-stack-decisions.md の決定性・単純性方針と整合)
