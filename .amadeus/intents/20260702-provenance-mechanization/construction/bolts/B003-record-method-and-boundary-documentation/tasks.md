# Construction Tasks

- [x] T001: `policies.md` の provenance 記録方法の記述を更新する
  - 作業:
    - `.amadeus/steering/policies.md` の provenance 記録方法の記述を、`provenance:generate` による生成を前提にした記述へ更新する。「provenance の最低記録項目」9 項目の定義自体は変更せず、記録手段（手書きから `provenance:generate` の実行への変更）と出力先（`provenance/Pnnn-<slug>.json`）を明記する。
    - 検査責務境界（validator = 成果物構造の検証、`provenance:check` = 実測値の照合、evaluator = 意味と接続性の評価）が Inception の `decisions/D001-inspection-boundary-adoption.md` から追跡できることを確認し、`policies.md` にその参照が欠けている場合は追記する。境界の再定義は行わない。
  - 要求: R004, R005
  - ユースケース: UC003
  - 依存: B001/T002, B002/T002
  - 設計根拠: ../../U001-provenance-record-contract/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: `development.md` の stage と workspace 対応記録の表を更新する
  - 作業:
    - `.amadeus/development.md` の「stage と workspace 対応記録」の表を、新しい記録先（対象 Intent 直下の `provenance/`）と矛盾しない記述へ更新する。
    - `provenance:generate` / `provenance:check` の実行入口（`package.json` の script 名）への参照を、既存の記述形式に合わせて必要な範囲で補う。
    - `examples/skill-provenance.json` と並立し統合しない方針（Inception D003、Construction GD004）と矛盾しないことを確認する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U001-provenance-record-contract/functional-design/domain-entities.md
  - 証拠: [test-results.md](test-results.md)
