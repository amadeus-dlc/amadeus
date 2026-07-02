# Construction Tasks

- [x] T001: eval を先行追加し、RED を確認する。
  - 作業:
    - `dev-scripts/evals/state-scaffold/check.ts` を新設し、一時ディレクトリの fixture workspace に対して 7 遷移（intent-capture、inception-start、inception-complete、construction-start、functional-design、bolt-preparation、finalization）を順に実行して、各遷移直後の validator が `state.json` に起因する構造 fail を出さないことを検証する。
    - 冪等性（同じ遷移の再実行で結果不変）と既存値保持（前 phase のブロックと evidence の不変）の検証ケースを含める。
    - `package.json` に `test:it:state-scaffold` 入口を追加し、`test:it:all` の連鎖に組み込む。
    - スクリプト未実装の状態で eval が失敗（RED）することを実行結果で確認し、記録する。
  - 要求: R005
  - ユースケース: UC002
  - 依存: なし
  - 設計根拠: ../../U001-state-scaffold-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 雛形生成スクリプトを実装し、GREEN を確認する。
  - 作業:
    - `skills/amadeus-validator/scripts/StateScaffold.ts` を新設し、workspace、Intent ディレクトリ名、遷移種別、補助引数（対象 Unit、対象 Bolt）を受けて `state.json` を生成、更新する。
    - 遷移定義は Functional Design の BL001〜BL005 に従う。対象遷移が定義する項目だけを設定し、既存値を保持し、冪等にする。必須成果物配列と evidence は実在ファイルの走査で確定する。
    - 状態語彙は同じ skill 内の `validator/generated/**` から import し、直書きを最小にする。
    - 不正な遷移種別と不足引数では、利用可能な遷移種別と引数を示して失敗する。
    - `npm run test:it:state-scaffold` で T001 の eval が pass（GREEN）することを確認する。
  - 要求: R001, R002, R003
  - ユースケース: UC001, UC002
  - 依存: T001
  - 設計根拠: ../../U001-state-scaffold-contract/functional-design/business-logic-model.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: amadeus-validator の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を実行し、`scripts/` を含む昇格先を同期する。
    - `npm run test:it:promote-skill` で同期を確認する。
    - 昇格先のスクリプト（`.agents/skills/amadeus-validator/scripts/StateScaffold.ts`）が repo root の開発用スクリプトなしで実行できることを確認する。
  - 要求: R003, R006
  - ユースケース: なし
  - 依存: T002
  - 設計根拠: ../../../inception/units/U001-state-scaffold-contract/design.md
  - 証拠: [test-results.md](test-results.md)
