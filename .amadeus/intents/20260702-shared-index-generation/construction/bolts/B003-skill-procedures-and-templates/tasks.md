# Construction Tasks

- [x] T001: amadeus-ideation-intent-capture の手順とテンプレートを更新する。
  - 作業:
    - `skills/amadeus-ideation-intent-capture/SKILL.md` の手順 4「`.amadeus/intents.md` に Intent 行と依存関係行を追加または補修する」を、「Intent のモジュールファイルに概要と依存（理由付き）を記述し、`bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>` で共有インデックスを再生成する」へ差し替える。
    - Intent Record の構成説明と成果物の記述を、共有インデックスが生成物であることに合わせて更新する。
    - `skills/amadeus-ideation-intent-capture/templates/intents/intent-record.md` に `## 概要` と `## 依存`（依存、理由の表）の見出しを追加する。
  - 要求: R005
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: amadeus-discovery の手順を更新する。
  - 作業:
    - `skills/amadeus-discovery/SKILL.md` の `discoveries.md` セクション（一覧へ行を 1 つ追加する手順、列の書き方、「既存行は並べ替えない」）を、モジュールファイルの記述と再生成の実行に差し替える。行の並び順が識別子の辞書順で決まることを明記する。
    - `discoveries.md` が存在しない場合の作成も、再生成スクリプトの実行として案内する。
  - 要求: R005
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: amadeus-steering のテンプレートを更新する。
  - 作業:
    - `skills/amadeus-steering/templates/steering/intents.md` と `discoveries.md` の雛形を、B001 のマーカー定数と同じ文言の生成マーカー付きの形へ差し替える。
    - `skills/amadeus-steering/SKILL.md` に index 雛形への言及があれば、生成物であることに合わせて更新する。
  - 要求: R005
  - ユースケース: UC001
  - 依存: なし
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T004: 変更した skill の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts <skill> --replace` を amadeus-ideation-intent-capture、amadeus-discovery、amadeus-steering に対して実行する。
    - `npm run test:it:promote-skill` で同期を確認する。
  - 要求: R005
  - ユースケース: なし
  - 依存: T001, T002, T003
  - 設計根拠: ../../U001-shared-index-generation-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
