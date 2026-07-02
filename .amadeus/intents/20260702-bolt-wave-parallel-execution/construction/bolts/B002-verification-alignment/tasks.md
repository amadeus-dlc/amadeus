# Construction Tasks

- [ ] T001: e2e mock eval の非破壊を確認する。
  - 作業:
    - `npm run test:all`（`test:e2e:construction:initial:all:mock` と `test:e2e:construction:internal:*:mock` を含む）の pass を確認し、wave 契約の追加が既存 eval の期待出力に影響しないことを確定する。
    - 影響がある場合は、調整の範囲と理由を記録して期待値を調整する。影響がない場合は、その旨を test-results.md に記録する。
  - 要求: R004
  - ユースケース: UC004
  - 依存: なし
  - 設計根拠: ../../U001-bolt-wave-execution-contract/functional-design/business-rules.md
  - 証拠: 未登録

- [ ] T002: skill-forge 確認を実施して記録する。
  - 作業:
    - wave 契約の追加について、skill 境界（親 skill の orchestration 責務との一致）、本文指示の矛盾（内部プロセス、実行モード、禁止事項との整合）、trigger description への影響、eval coverage を確認する。
    - 確認結果を PR 説明の固定見出し「skill-forge 確認」に記録する。
  - 要求: R004
  - ユースケース: なし
  - 依存: T001
  - 設計根拠: ../../U001-bolt-wave-execution-contract/functional-design/business-rules.md
  - 証拠: 未登録
