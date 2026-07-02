# Construction Tasks

- [x] T001: 検証を先行追加し、RED を確認する。
  - 作業:
    - `dev-scripts/evals/index-generate/check.ts` に validator 統合の検証ケースを追加する（または既存の validator eval 構成に合わせた配置を実装時に選ぶ）。
    - ケース: (1) 整合した fixture workspace で validator の index 整合検査が pass する、(2) インデックスの行を改変すると fail になる、(3) 行の過不足で fail になる、(4) 生成マーカーの欠落で fail になる、(5) モジュールの見出し契約違反がクラッシュではなく fail として報告される。
    - validator 未対応の状態で検証が失敗（RED）することを確認し、記録する。
  - 要求: R007
  - ユースケース: UC003
  - 依存: なし
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: validator に不整合検査を追加し、GREEN を確認する。
  - 作業:
    - `skills/amadeus-validator/validator/AmadeusValidator.ts` に、`../scripts/IndexGenerate` の `buildIntentsIndex` と `buildDiscoveriesIndex` を import した不整合検査を追加する。
    - 期待内容と実ファイルの完全一致（マーカーを含む）を検査し、不一致は対象と理由を fail として報告する（BL006、BR008）。
    - `HeadingContractViolationError` は catch して fail として報告し、validator を異常終了させない。
    - 検査カテゴリを追加し、報告に分類が出るようにする。
    - T001 の検証が pass（GREEN）することを確認する。
  - 要求: R004
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: amadeus-validator の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を実行し、`npm run test:it:promote-skill` で同期を確認する。
    - この時点で `npm run test:all` は、未 migration の workspace と examples の index 整合検査で fail する。fail の内容が意図した対象（migration 前の index）だけであることを確認して記録する。全体の GREEN は B004 の migration 後に確認する。
  - 要求: R005
  - ユースケース: なし
  - 依存: T002
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
