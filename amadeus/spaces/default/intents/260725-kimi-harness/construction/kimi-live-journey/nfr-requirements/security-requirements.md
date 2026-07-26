上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — kimi-live-journey

> 上流入力の使用箇所: business-logic-model.md の hermeticity 機構、business-rules.md の BR-2(隔離)、requirements.md の FR-9 を根拠とする。

## 対象の概要

live journey は実機の kimi バイナリを起動するため、隔離がセキュリティの中核。

## 脅威モデルと基準

- **ユーザーの実環境を汚さない**: `KIMI_CODE_HOME` を tmp に向け、実 `~/.kimi-code/config.toml` を参照・変更しない(business-logic-model.md §hermeticity の機構)
- **tmp プロジェクトで完結**: dist/kimi の配置・hook 配線の有無も tmp 側で制御(business-rules.md BR-2)
- **credential 非接触**: journey は credential を読み書きしない(実機の認証は Kimi 側の既存ログインを利用し、journey が新たに扱わない)。**認証の所在に関する前提**: Kimi の認証情報が `KIMI_CODE_HOME` 配下にある場合、tmp 差替で journey 環境は未認証となりうる。認証が差替の影響を受けるかは driver 作成時の実機確認(requirements.md A3)で確定し、影響する場合は journey 側で tmp 環境への認証供給(実機の OAuth を tmp にコピーしない方針 — 影響する場合の扱いは driver 実装時に決定)とする

## コンプライアンス

該当なし(requirements.md §制約に規制項目は存在しない)。
