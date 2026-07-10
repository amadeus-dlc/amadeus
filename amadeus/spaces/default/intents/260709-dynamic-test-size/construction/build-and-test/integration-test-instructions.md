# Integration Test Instructions — dynamic-test-size(#699)

> Minimal 戦略のため新規統合テストは作成しない。既存統合テストが本 intent の契約面を既にカバーする(その維持確認が統合検証)。

## 対象既存テスト

| テスト | 検証する契約 |
|---|---|
| `tests/integration/t112.serial.test.ts` | runner の exit == failed-file 数(NFR-1)。scratch tree に `tests/lib/test-size.ts` をコピーして実 runner を駆動 |
| `tests/unit/t-test-size-drift.test.ts`(on-disk guard) | 静的 drift guard の非退行(BR-7) |

## 実行方法

```
bash tests/run-tests.sh --integration --filter "t112"
bash tests/run-tests.sh --ci        # 全層(smoke+unit+integration)
```

## runner 経由の E2E 相当確認(手動再現手順)

1. `// size: small` + 1s 超の busy-wait を持つ一時ファイルを `tests/unit/` に置く
2. `bash tests/run-tests.sh --unit --filter "<fixture名>"` → `wall-clock drift: 1 file(s)` と `tests/logs/test-size-report.json` のレコードを確認(exit 0 = advisory)
3. 削除して再実行 → `0 file(s)`
