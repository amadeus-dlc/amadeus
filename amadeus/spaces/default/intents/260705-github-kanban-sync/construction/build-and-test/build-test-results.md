# Build and Test Results（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 実行結果（2026-07-05）

| 検証 | 結果 |
|---|---|
| `npm run test:all`（typecheck / lint / contracts / parity / wiring / evals / engine e2e / diff）| exit 0 |
| kanban-registry eval | 19 検査 ok |
| kanban-sync eval | 30 検査 ok |
| kanban-hooks eval | 17 検査 ok |
| validator（AmadeusValidator . 260705-github-kanban-sync） | pass |
| CLI ガード実機（usage / worktree --all 拒否） | 確認済み |
| QueueHook 実機スモーク（stdin → queue 追記） | 確認済み |

## 未消化

board 実表示の end-to-end 確認は人間操作（E1 / E2）待ち。PR #474 の walking skeleton 確認手順で実施する。
