# Code Summary — swarm-batch-progress（Issue #486）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更内容

| ファイル | 変更 | 対応 |
|---|---|---|
| `.agents/amadeus/tools/amadeus-orchestrate.ts` | `tryEmitSwarm` を coverage ベースのバッチ進行へ（未完了 unit を含む最初の batch の未完了 unit のみ提示。全 covered で false → all-covered 再入） | R001〜R003 |
| `dev-scripts/data/parity-map.json` | engineFileExceptions へ `tools/aidlc-orchestrate.ts` を宣言 | N3 |
| `dev-scripts/evals/swarm-batch-progress/check.ts` + `package.json` | 4 検査の eval を新設し `test:it:all` へ結線 | N1 / N2 |

## TDD の記録

- RED: 修正前エンジンで (b) batch 2 提示、(c) 全完了後の非発火、の 2 件が失敗（常に `["u-a1","u-a2"]` を再提示）することを確認。
- GREEN: 4 検査 ok（部分完了 batch の未完了 unit のみ提示 = AC3 を含む）。`npm run test:all` exit 0。
- eval は #481 で修正した jump の Skipped 通過を利用して Construction まで前進する（修正同士の合成が実 CLI で成立することの傍証）。
