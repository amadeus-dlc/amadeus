# Security Design — U2 visualize-hardening

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

- U2-SEC-01(注入面の非拡大)の実現: 強調 class 名 "regressed"・凡例行は静的定数(business-logic-model.md 増分2)。動的値の埋め込み経路は U1 の escapeHtml 集約のまま増えない
- U2-SEC-02(CI 権限不変)の実現: 追加ステップは `run: bun scripts/metrics-visualize.ts --write` のみ(business-logic-model.md 増分4)— 新 secret・新 permission・新 action を宣言しない。reliability-requirements.md U2-REL-03 の loud-fail 面とセットで diff レビュー観点に固定
- U2-SEC-03(docs 記載制約)の実現: docs テンプレートにパス例はリポジトリ相対のみ(scalability-requirements.md の対象外事項と同様、環境固有値を書かない)

## 非対象

- 新規スキャン・監査機構(security-requirements.md 非対象、tech-stack-decisions.md の依存ゼロ)
