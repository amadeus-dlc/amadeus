# Construction Tasks

- [x] T001: auto 判定表へ再開行を追加し、Decision Review 記述へ検出結果の参照を追加する。
  - 作業:
    - `skills/amadeus-construction/SKILL.md` の auto 判定表に、BR004 の再開行（`phase` が `construction` で、対象 Bolt が実装済みかつ検証済み、`pr.md` なし、`construction.gate` 未 passed → finalization）を refine の行より先に評価される位置へ追加する。
    - Decision Review の入力証拠の列挙に、同梱スクリプト（`scripts/list-unfinalized-intents.ts`）の検出結果を追加し、検出結果が得られない場合は通常の判定へ戻ることを書く（BR005）。
  - 要求: R003
  - ユースケース: UC002
  - 依存: B001/T002
  - 設計根拠: ../../U001-finalization-resume-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: promote で昇格先を同期し、混入がないことを確認する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-construction --replace` を実行し、`scripts/` が昇格先へ反映され、`evals/` が混入しないことを確認する。
    - `npm run test:it:promote-skill` を実行する。
  - 要求: R003, R004
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-finalization-resume-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
