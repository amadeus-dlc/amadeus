# Scalability Design — solo-election-core (U1)

上流入力(consumes 全数): performance-requirements.md(U1-PERF)、security-requirements.md(U1-SEC)、scalability-requirements.md(U1-SCALE)、reliability-requirements.md(U1-REL)、tech-stack-decisions.md(層配置・形式検証の決定)、business-logic-model.md(tally 2体分岐・TLA 対応の設計正本)。

## 設計

- U1-SCALE-01(3体以上不変): 2体分岐は else 側に既存コードを**そのまま**残す構造(条件の外側移動・共通化リファクタをしない — 不変性を diff 形状で自明にする)。
- U1-SCALE-02(store 不変): store/record/registry ファイルは変更対象外(components.md の不変境界どおり)。

## 検証配線

FR-06 regression は「修正前 tally の出力スナップショット(3〜6体代表組合せ)」をテスト内固定値として持ち、修正後の bit 一致を assert する形で実装(自己参照比較の禁止 — 期待値は修正前実行から転記し、導出コメントを付す)。
