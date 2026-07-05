# Build and Test Results（260705-jump-phase-guard）

上流入力: [code-summary.md](../jump-phase-guard/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 実行結果（2026-07-05）

| 検証 | 結果 |
|---|---|
| jump-phase-guard eval（新設） | 15 検査 ok（修正前は同 eval で 10 件失敗 = RED を確認済み） |
| hooks-state-bugfix eval（退行確認） | pass |
| `npm run test:all`（typecheck / lint / parity / evals / engine-e2e / diff） | exit 0 |

## 未消化

なし。
