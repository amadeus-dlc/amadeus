# Construction Tasks

- [ ] T001: 検証を先行追加し、RED を確認する。
  - 作業:
    - `dev-scripts/evals/gate-queue-list/check.ts` を新設し、一時ディレクトリの fixture workspace（複数 Intent の `state.json` を持つ最小の `.amadeus/`）に対して次を検証する。
    - 承認待ちあり: `taskGeneration.status` が `ready_for_approval` の Bolt、phase gate が `waiting_approval` の Intent、`status` が `waiting_approval` の Intent が、Intent、phase、ゲート、待ち理由の 4 列 Markdown 表に出る。
    - 非検出: gate が `not_ready`、`passed`、`failed`、`taskGeneration.status` が `ready_for_approval` 以外の Intent は表に出ない。
    - 0 件: 承認待ちがない workspace で「承認待ちはありません。」が出力され、exit 0 で終了する。
    - 決定論性: 同じ入力で 2 回実行した出力が一致する。
    - 解釈不能: JSON として解釈できない `state.json` は stderr へ警告のうえ読み飛ばされ、一覧全体は exit 0 で終了する。
    - 対象外: `.amadeus/intents` がない workspace は stderr へ通知のうえ exit 0、workspace 引数の欠落または不存在は exit 1 になる。
    - `package.json` に `test:it:gate-queue-list` 入口を追加し、既存の test 連鎖に組み込む。
    - スクリプト未実装の状態で検証が失敗（RED）することを実行結果で確認し、記録する。
  - 要求: R005
  - ユースケース: UC001, UC002
  - 依存: なし
  - 設計根拠: ../../U001-approval-queue-listing-contract/functional-design/business-rules.md
  - 証拠: 未登録

- [ ] T002: GateQueueList.ts を実装し、GREEN を確認する。
  - 作業:
    - `skills/amadeus-validator/scripts/GateQueueList.ts` を新設し、workspace を受けて `.amadeus/intents/*/state.json` を横断スキャンし、承認待ち一覧を stdout へ出力する。
    - 走査、判定、整形、対象外の扱いは Functional Design の BL001 から BL007 に従う。判定語彙は `validator/generated/task-generation-contract.ts` を import して参照し、値を複製しない。
    - 待ち理由は「`<フィールドパス>` が `<値>`」形式（BR003）、並び順は Intent ID 辞書順、phase 順、Bolt ID 昇順（BR004）にする。
    - `npm run test:it:gate-queue-list` で T001 の検証が pass（GREEN）することを確認する。
  - 要求: R001, R002, R003
  - ユースケース: UC001, UC002, UC003
  - 依存: T001
  - 設計根拠: ../../U001-approval-queue-listing-contract/functional-design/business-logic-model.md
  - 証拠: 未登録

- [ ] T003: amadeus-validator の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-validator --replace` を実行し、`scripts/GateQueueList.ts` を含む昇格先を同期する。
    - `npm run test:it:promote-skill` と `npm run test:all` で同期と非破壊を確認する。
  - 要求: R004
  - ユースケース: なし
  - 依存: T002
  - 設計根拠: ../../U001-approval-queue-listing-contract/functional-design/business-rules.md
  - 証拠: 未登録
