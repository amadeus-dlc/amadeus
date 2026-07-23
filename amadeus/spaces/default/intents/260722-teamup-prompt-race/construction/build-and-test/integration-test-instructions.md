# Integration Test Instructions — 260722-teamup-prompt-race

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1384-watcher-arming/code-generation/)。

## 対象

- **新規(本 fix のリグレッションテスト)**: `tests/integration/t-team-up-watcher-arming.test.ts` — 7件: ハッピーパス(全員 armed→exit 0)、**落ちる実証**(未 armed 残存→非ゼロ exit+メンバー名列挙)、再送回復、冪等(既 armed skip)、stale センチネル除去、herdr JSON 順序非依存
- **既存 fixture 更新分**: `tests/integration/t-team-up-msg-backend.test.ts`、`tests/integration/t-team-up-codex-resume.serial.test.ts`(新検証経路到達分のセンチネルシミュレート)

## 実行

```
bun test tests/integration/t-team-up-watcher-arming.test.ts tests/integration/t-team-up-msg-backend.test.ts tests/integration/t-team-up-codex-resume.serial.test.ts tests/unit/t-team-up-codex-safety-wait.test.ts
bash tests/run-tests.sh --ci   # 全層(smoke/unit/integration/e2e)の回帰
```

## 判定

- 個別実行: exit 0、`Ran 94 tests across 4 files` の全数実行確認
- フルスイート: `RESULT: PASS`(既存赤の持ち込みなし — 変更前ベースラインは CG 段で PASS 実測済み)
