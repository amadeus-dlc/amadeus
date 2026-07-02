# Construction Tasks

- [x] T001: amadeus-validator の利用者向け文書へ一覧の実行手順を記載する。
  - 作業:
    - `skills/amadeus-validator/SKILL.md` の `## 同梱スクリプト` に、承認待ちキュー一覧（`GateQueueList.ts`）の用途（承認待ちの Intent、phase、ゲート、待ち理由の一覧）、実行コマンド `bun run .agents/skills/amadeus-validator/scripts/GateQueueList.ts <workspace>`、0 件時の表示、exit code 契約（正常は 0、入力エラーは 1）、`.amadeus/intents` がない workspace の対象外の扱いを追記する。
    - 記載は Functional Design の BR001〜BR007 の契約と矛盾しない利用者向け説明に留める。
  - 要求: R004
  - ユースケース: UC001, UC003
  - 依存: なし
  - 設計根拠: ../../U001-approval-queue-listing-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)

- [x] T002: amadeus-validator の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を実行し、SKILL.md の手順記載を含む昇格先を同期する。
    - `npm run test:it:promote-skill` と `npm run test:all` で同期と非破壊を確認する。
  - 要求: R004
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-approval-queue-listing-contract/functional-design/business-rules.md
  - 証拠: [test-results.md](test-results.md)
