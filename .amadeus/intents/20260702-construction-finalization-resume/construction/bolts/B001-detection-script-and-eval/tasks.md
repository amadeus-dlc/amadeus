# Construction Tasks

- [x] T001: 検出スクリプトの eval を先に追加し、RED を確認する。
  - 作業:
    - `skills/amadeus-construction/evals/list-unfinalized-intents/check.ts` を作成し、一時 fixture で「未 finalize あり」「なし」「対象外（`.amadeus/intents` なし）」の3状態を D002 の契約（stdout 1行1件、exit 0 は正常、exit 1 は入力エラー、対象外は stderr 通知で exit 0）で検証する。
    - `package.json` に eval の検証入口（`test:it:*`）を追加し、`test:it:all` へ組み込む。
    - 実装前に eval を実行し、失敗（RED）を確認して記録する。
  - 要求: R002, R004
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-finalization-resume-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 検出スクリプトを最小実装し、GREEN を確認する。
  - 作業:
    - `skills/amadeus-construction/scripts/list-unfinalized-intents.ts` を新設し、BR001 の判定規則（`construction.gate` 未 passed、`targetBolts` の全 Bolt に `test-results.md` あり、`pr.md` を欠く Bolt が存在）と BR003 の入出力契約を実装する。
    - gh CLI、ネットワーク、repo root の開発用スクリプトへ依存しない読み取り専用の実装にする。
    - eval が pass する（GREEN）ことを確認する。
  - 要求: R001, R002
  - ユースケース: UC001
  - 依存: T001
  - 設計根拠: ../../U001-finalization-resume-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)
