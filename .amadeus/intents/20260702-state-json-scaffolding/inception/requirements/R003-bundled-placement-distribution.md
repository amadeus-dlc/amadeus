# R003 同梱配置と配布先実行

## 要求

雛形生成スクリプトは、`amadeus-validator` の同梱スクリプト（`skills/amadeus-validator/scripts/`）として 1 箇所に置かれ、promote で昇格し、配布先ユーザー環境（repo root の開発用スクリプトなし）で動作する。

## 背景

skill の実行時参照に repo の開発用スクリプトは使えない。
配置先は grilling（G001 GD001）で確定した。`state.json` の要求構造の定義元は validator の契約であり、同じ skill 内なら生成済み契約（`validator/generated/**`）を実行時に再利用できるため、雛形と検査の乖離が構造的に起きにくい。

## 受け入れ条件

- スクリプトが `skills/amadeus-validator/scripts/` に置かれ、promote で `.agents/skills/amadeus-validator/scripts/` へ反映される。
- 配布先ユーザー環境相当（repo root の開発用スクリプトを参照しない状態）で `bun` から実行できる。
- 6 遷移を 1 つの入口で扱い、各 phase skill からは参照を 1 行で書ける。

## 依存

なし。

## 対応する対象境界

- SC-IN-002

## 未確認事項

- なし。
