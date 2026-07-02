# Construction Tasks

- [x] T001: amadeus-decision-review にトリガーの判定規則と記録規約を定義する。
  - 作業:
    - `skills/amadeus-decision-review/SKILL.md` に、前段 phase 必須成果物の `未確定事項` と `未確認事項` 見出しのうち「<現在 phase> で判断する」を含む項目が 1 件以上残っている場合は outcome を `grill_required` とする決定論的トリガーを定義する。
    - 後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書くという記録規約を、同じ契約の中に定義する。
    - 調査で解消できる項目は解消根拠を記録し、残った項目だけを一問ずつ確認する例外を定義する。
  - 要求: R002
  - ユースケース: UC003
  - 依存: なし
  - 設計根拠: ../../U001-phase-gate-skill-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: 3 つの phase skill の Decision Review 節へ規則参照を追加する。
  - 作業:
    - `skills/amadeus-ideation/SKILL.md`、`skills/amadeus-inception/SKILL.md`、`skills/amadeus-construction/SKILL.md` の Decision Review 節に、T001 で定義した決定論的トリガーを参照する記述を追加する。
    - 3 つの skill の記述は同じ規則を参照し、判定規則の定義を重複させない。
  - 要求: R002
  - ユースケース: UC003
  - 依存: T001
  - 設計根拠: ../../U001-phase-gate-skill-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: ideation の auto 判定の scaffold-only 条件を限定する。
  - 作業:
    - `skills/amadeus-ideation/SKILL.md` の auto 判定表の scaffold-only 行の条件「質問不要で進められる」を、確定判断の記録（GitHub Issue の確定判断、Grilling Decision Trail、Discovery Brief の確定済み判定と候補判断）への参照が入力に存在し、Ideation の判断項目がそこから導けることに変更する。
    - `scaffold-only` 節の許可条件も同じ定義に合わせ、選択時に参照した確定判断の記録を示す行動を追記する。
  - 要求: R003
  - ユースケース: UC004
  - 依存: なし
  - 設計根拠: ../../U001-phase-gate-skill-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T004: 4 つの skill の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts <skill-name> --replace` を amadeus-decision-review、amadeus-ideation、amadeus-inception、amadeus-construction に対して実行する。
    - `npm run test:it:promote-skill` で同期を確認する。
  - 要求: R005
  - ユースケース: なし
  - 依存: T001, T002, T003
  - 設計根拠: ../../../inception/units/U001-phase-gate-skill-contract/design.md
  - 証拠: [test-results.md](test-results.md)
