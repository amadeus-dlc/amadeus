# Integration Test Instructions

Unit: docs-codekb-guards（Test Strategy: Minimal）

## 対象

エンジン全体との統合は、既存の決定論的統合検証で確認する。

```sh
npm run test:it:engine-e2e   # エンジン sandbox e2e（20 検査、LLM なし・本番 aidlc/ 非変更）
npm run test:it:promote-skill # validator 昇格先と source の同期
npm run test:all              # repo 標準検証（全 eval・lint・parity・contracts を含む）
```

## 観点

- `GUARD_EXEMPTED` の追加が既存の audit 検査・engine e2e を壊さないこと。
- validator の参照解決型判定が既存 record（本 Intent、260705-steering-learnings ほか）で fail を出さないこと（`test:it:amadeus-validator` / `test:it:amadeus-validator-domain` を含む）。
- parity: `npm run parity:check` が engineFileExceptions / exceptions の宣言込みで ok であること。

## 結果

すべて pass。詳細は [build-test-results.md](build-test-results.md) を参照する。
