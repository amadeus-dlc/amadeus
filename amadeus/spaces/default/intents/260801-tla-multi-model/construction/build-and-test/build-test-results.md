# ビルド・テスト結果

本ファイルは全 Unit の `code-generation-plan.md` / `code-summary.md` に対する統合実行結果を記録する。2026-08-02 の最終再実行で全品質ゲートが合格した。

## 実行結果

| 検証 | 状態 | 結果 |
|---|---|---|
| Package drift | 合格 | 7 harness と formal-model-check plugin 配布物が正本と同期、exit 0 |
| Promotion drift | 合格 | 5つの project-local root harness が同期、exit 0 |
| Typecheck | 合格 | production / tests の両 tsconfig、exit 0 |
| Lint | 合格 | error 0、既存 warning 365件・info 22件、exit 0 |
| Complexity gate | 合格 | 新規違反0、regression 0、threshold 15 |
| 重点 Unit/Integration | 合格 | formal-model-check 9ファイル `45 pass / 0 fail / 206 expect` |
| サイズ純粋性 | 合格 | t402 / t403 / drift guard `42 pass / 0 fail / 83 expect` |
| 並列隔離 | 合格 | t384 と t66 の同時実行 `94 pass / 0 fail`、stage graph hash 不変 |
| Full CI | 合格 | 719ファイル、9,763アサーション、失敗0、`RESULT: PASS` |

## Build and Test での是正

- 実ファイル・一時ファイルを扱う t402 / t403 を unit から integration へ移し、`size: medium` を明示した。allowlist は増やしていない。
- CI evidence 検証と CLI composition root の3関数を責務分割し、CCN 18 / 22 / 17 の新規違反を閾値以下へ下げた。振る舞いとエラー優先順位は重点45テストで不変を確認した。
- t384 の graph compile span 検証が配布済み stage graph を書き換えていたため、出力先を fixture 内へ隔離した。t66 との並列実行および最終フル CI で競合解消を確認した。

## 性能・セキュリティ証跡

- u5 code-generation の実 Docker acceptance は12 run verify PASS、644,215.468ms、最大120,247.522ms、Mirror 統計 208,628 / 89,099 / 0 / depth 18 である。
- path/symlink/identity/unknown-model/unknown-vocabulary/CI-permissions の負例は重点スイートで合格した。
- `git diff main...HEAD -- package.json bun.lock` は差分なしで、新規依存・権限増加・秘密情報の追加はない。
- GitHub hosted Ubuntu の実測は未実施であり、最終 CI acceptance の残リスクとして保持する。
