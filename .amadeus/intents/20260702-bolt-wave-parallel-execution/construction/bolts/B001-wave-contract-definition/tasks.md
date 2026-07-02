# Construction Tasks

- [ ] T001: amadeus-construction へ wave 実行契約を定義する。
  - 作業:
    - `skills/amadeus-construction/SKILL.md` の `内部プロセス` の直後に、新見出し `Bolt の wave 実行` を追加する（BR001）。
    - wave の導出規則（依存がすべて前の wave までに完了する Bolt の集合を wave 1 から順に導出、循環時は `bolts.md` の補修へ戻す。BR002）、適用条件と直列既定（BR003）、worktree 分離での並行実行と steering policy への一般形参照（BR004）、wave 完了時の統合と検証と進行条件（BR005）、wave 単位のまとめ承認の運用（BR006）を、肯定形の行動指針として書く。
    - Bolt ごとの Task Generation Gate と内部プロセスの順序が wave 並行でも変わらないことを明記する（INV002）。
  - 要求: R001, R002, R003, R004
  - ユースケース: UC001, UC002, UC003, UC004
  - 依存: なし
  - 設計根拠: ../../U001-bolt-wave-execution-contract/functional-design/business-rules.md
  - 証拠: 未登録

- [ ] T002: amadeus-construction の昇格先を promote で同期する。
  - 作業:
    - `bun run dev-scripts/promote-skill.ts amadeus-construction --replace` を実行し、SKILL.md の wave 契約を含む昇格先を同期する。
    - `npm run test:it:promote-skill` の pass を確認する。
  - 要求: R004
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-bolt-wave-execution-contract/functional-design/business-rules.md
  - 証拠: 未登録
