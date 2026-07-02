# Construction Tasks

- [x] T001: implementation-execution の前提を人間承認済みだけに変更する。
  - 作業:
    - `skills/amadeus-construction-implementation-execution/SKILL.md` の前提「`taskGeneration.status` が `ready_for_approval` または `passed` でない場合は、実装せずに停止する」を、「`taskGeneration.status` が `passed`（人間承認済み）の場合だけ実装へ進む」に変更する。
    - `ready_for_approval` の場合は実装せずに停止し、人間承認待ちであることを報告する行動を肯定形で追記する。
  - 要求: R001
  - ユースケース: UC002
  - 依存: なし
  - 設計根拠: ../../U001-phase-gate-skill-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: bolt-preparation に停止と承認待ちの行動を明記する。
  - 作業:
    - `skills/amadeus-construction-bolt-preparation/SKILL.md` の手順に、`ready_for_approval` へ到達したら実装へ進まず停止して人間の承認を待つ行動を肯定形で追記する。
    - 承認を得てから `status` を `passed` にし、`evidence` へ `kind: approval` の項目を追加する行動が、停止の後の手順として読めるようにする。
    - T001 の implementation-execution 側の文言と、状態名と行動の表現を揃える。
  - 要求: R001
  - ユースケース: UC001
  - 依存: T001
  - 設計根拠: ../../U001-phase-gate-skill-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T003: 両 skill の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-construction-implementation-execution --replace` を実行する。
    - `bun run dev-scripts/promote-skill.ts amadeus-construction-bolt-preparation --replace` を実行する。
    - `npm run test:it:promote-skill` で同期を確認する。
  - 要求: R005
  - ユースケース: なし
  - 依存: T001, T002
  - 設計根拠: ../../../inception/units/U001-phase-gate-skill-contract/design.md
  - 証拠: [test-results.md](test-results.md)
