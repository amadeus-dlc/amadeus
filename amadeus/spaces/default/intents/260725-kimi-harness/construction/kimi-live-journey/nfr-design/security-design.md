上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Security Design — kimi-live-journey

> 上流入力の使用箇所: security-requirements.md の3基準(実環境を汚さない・tmp 完結・credential 非接触と認証所在の前提)を設計の対象とする。

## 対象の概要

security-requirements.md のとおり、隔離がセキュリティの中核。

## 設計

- **隔離の実装**: `runPrintSession` の `env` で `KIMI_CODE_HOME=<tmp>` を注入し、実 config を参照・変更しない(business-logic-model.md §hermeticity の機構)
- **tmp 完結**: dist/kimi の配置・hook 配線状態も tmp 側で制御し、実環境への配線は行わない
- **認証**: 認証情報が `KIMI_CODE_HOME` 配下にあるかは driver 作成時の実機確認で確定し、影響する場合の扱い(tmp 環境への供給方針)を driver 実装時に決定する(security-requirements.md §脅威モデルと基準の前提)。実機の OAuth を tmp にコピーしない
