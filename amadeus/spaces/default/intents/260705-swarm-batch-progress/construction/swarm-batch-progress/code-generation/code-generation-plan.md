# Code Generation Plan — swarm-batch-progress（Issue #486）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 計画（TDD）

1. RED: `dev-scripts/evals/swarm-batch-progress/check.ts`（隔離 workspace 実 CLI、4 検査）を追加。修正前のエンジンで (b)(c) が失敗（常に batch 1 を提示）することを確認する。fixture は 2 unit batch を含む（AC3 の直接検証、reviewer 指摘対応）。
2. GREEN: `tryEmitSwarm` を coverage ベースへ変更する。batches を先頭から走査し、`unitCovered`（per-unit ループと同一の判定）で未完了 unit を含む最初の batch の未完了 unit だけを提示する。全 covered なら false を返し、`emitPerUnitRunStage` の all-covered 再入（gate 付き run-stage）へ落とす。呼び出し 2 箇所へ recordPrefix / codekbCtx を配線する。
3. 手続き: parity engineFileExceptions へ `tools/aidlc-orchestrate.ts` を宣言。
4. 検証: eval 4 検査 GREEN、`npm run test:all` exit 0。
