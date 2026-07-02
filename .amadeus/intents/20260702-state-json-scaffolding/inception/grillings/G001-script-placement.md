# G001: 雛形生成スクリプトの配置先

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | 雛形生成スクリプトは `amadeus-validator` の同梱スクリプト（`skills/amadeus-validator/scripts/`）として共有 1 箇所に置く。6 遷移を 1 スクリプトで扱い、各 phase skill は参照を 1 行書くだけにする。 | active | [requirements/R003-bundled-placement-distribution.md](requirements/R003-bundled-placement-distribution.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: 雛形生成スクリプトの配置先を、amadeus-validator への共有 1 箇所、各 phase skill への分散、新しい共有 skill の新設のどれにするか。
- 確認が必要な理由: Unit の責務境界と、validator の生成済み契約（`generated/**`）を実行時に再利用できるかが配置先で決まるため。Ideation の未確定事項に「Inception で判断する」と記録されていた。
- 推奨回答: amadeus-validator に共有 1 箇所として置く。
- 推奨理由: state.json の要求構造の定義元は validator の契約であり、同じ skill 内なら生成済み契約を実行時に再利用でき、雛形と検査の乖離が構造的に起きにくい。分散は共通ロジックの重複と同期コストを生み、新設 skill は管理対象を増やし確定入口 10 個の構成とずれる。
- ユーザー回答: 推奨回答どおり採用する。
