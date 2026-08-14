# 単体テスト手順

## 目的と入力

`code-generation-plan.md` の FR-1〜FR-3、FR-6 と `code-summary.md` の実装判断を入力として、blocking sensor の terminal verdict 判定を直接検証する。

## 実行手順

リポジトリルートで次を実行する。

`bun test tests/unit/t511-blocking-sensor-severity.test.ts tests/unit/t-sensor-fire-seam.test.ts`

## 合格条件

- 全テストが成功する。
- `SENSOR_PASSED` でも `script-error:` Note は `script-error` finding になる。
- 非文字列 Note は `script-error: note-unreadable` として fail-closed になる。
- Note なしと `tool-unavailable` は従来どおり pass する。
