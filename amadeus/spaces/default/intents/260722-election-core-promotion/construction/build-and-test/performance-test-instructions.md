# 性能テスト手順

`code-generation-plan.md` と `code-summary.md` の NFR に基づき、ネットワーク負荷ではなく CLI の定数回 prerequisite 検査と回帰時間を対象とする。

## 測定方法

```bash
time bun test tests/unit/t265-team-prerequisites.test.ts
time bun test tests/integration/t266-team-launcher-prerequisites.test.ts
time bun test tests/e2e/t267-clean-env-team-mode.serial.cli.test.ts
time bash tests/run-tests.sh --ci
```

## 合格基準

- prerequisite 検査は OS、herdr、agmsg を各1回以下で確認する。
- clean-env E2E 5ケースが通常の開発機で実用的な時間内に完了する。
- 新規実装によるテスト分類の意図しない large 化がない。
- wall-clock drift は advisory として記録し、機能失敗と混同しない。

## 実測上の注意

最終 CI では既存 `tests/integration/t-codex-hooks-migration.test.ts` のみ medium → large の advisory が発生した。今回追加した対象に性能失敗はない。
