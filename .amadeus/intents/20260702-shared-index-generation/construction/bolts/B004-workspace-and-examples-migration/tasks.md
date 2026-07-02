# Construction Tasks

- [x] T001: workspace の migration を実施する。
  - 作業:
    - `.amadeus/intents/*.md`（全 Intent モジュール）へ、現行 `intents.md` の概要、依存、依存理由を情報源として `## 概要`（H1 直後、本文 1 段落）と `## 依存`（依存、理由の 2 列の表）を追加する。複数依存で理由が結合されている Intent は、依存ごとの行に分割する。
    - `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts .` で `intents.md` と `discoveries.md` を再生成する。
    - `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .` で「Index 生成整合」の fail が 0 になることを確認する。
    - migration 前後の diff をレビューし、概要、依存、依存理由の情報が失われていないことを確認する。
  - 要求: R006
  - ユースケース: UC003
  - 依存: なし
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: eval fixture の migration を実施する。
  - 作業:
    - `dev-scripts/evals/amadeus-validator/`、`amadeus-validator-domain/`、`state-scaffold/` の fixture workspace に、見出し契約の追加と index の再生成（または期待値の更新）を行う。
    - `npm run test:it:amadeus-validator`、`test:it:amadeus-validator-domain`、`test:it:state-scaffold` がそれぞれ pass することを確認する。
  - 要求: R006
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: examples の migration と provenance の整備を実施する。
  - 作業:
    - `examples/01〜04` の各 snapshot の `.amadeus/intents/*.md` へ見出し契約を追加し、`IndexGenerate` で各 snapshot の index を再生成する。
    - B003 で変更した skill（intent-capture、discovery、steering）について、`examples/skill-provenance.json` の該当 entry を確認し、staleReason がない entry には既存の運用（Issue #179 方式）に従って staleReason を追記する。md5 は書き換えない。
    - `npm run test:it:amadeus-templates` と `npm run validate:all` が pass することを確認する。
  - 要求: R006
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T004: 全体検証を実施する。
  - 作業:
    - `npm run test:all` が exit 0 で pass することを確認する。
    - 並行統合の受け入れ確認として、fixture 上で 2 モジュール追加からの再生成が両方の行を含むこと（`test:it:index-generate` の並行統合ケース）が最終状態でも pass していることを確認する。
  - 要求: R002, R006
  - ユースケース: UC002, UC003
  - 依存: T001, T002, T003
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
