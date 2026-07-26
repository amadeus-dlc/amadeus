上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — kimi-hook-adapter

> 上流入力の使用箇所: security-requirements.md の4基準(parse のみ・秘密情報非保持・presence 真正性・capture 衛生)を設計の対象とする。

## 対象の概要

security-requirements.md が定める脅威モデルを、adapter の実装機構に落とす。

## 設計

- **入力の扱い**: stdin JSON は構造化 parse のみ。eval・動的ロード・テンプレート展開を行わない。未知フィールドは破棄し、既知フィールドも core hook が期待する形に限って渡す(security-requirements.md §脅威モデルと基準)
- **秘密情報**: adapter は credential を読まない・書かない・ログに出さない。captured payload に秘密が混入する経路を作らない(実装規律)
- **presence**: mint は UserPromptSubmit のみを対象とし、機械注入の判定は core 側分類器に委譲(adapter は判定を持たない — business-logic-model.md §dispatch フローの mint 経路)
- **capture 衛生**: probe はマーカー囲みで、除去後に config が元どおりであることを diff で確認(security-requirements.md §脅威モデルと基準の capture/probe 衛生項)
