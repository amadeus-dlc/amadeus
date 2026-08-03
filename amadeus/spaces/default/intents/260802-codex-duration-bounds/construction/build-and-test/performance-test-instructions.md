# Performance Test Instructions — Codex Duration Bounds

## 対象と上流

各Unitの `code-generation-plan.md` と `code-summary.md` のうち、duration baseline、停止予算、interaction budget、有界Unit poolを固定workloadで検証する。目的は絶対速度の短縮ではなく、入力を固定したときの停止性、最大同時実行数、attempt数、決定的queue順の証明である。

## 固定workload

`bounded-unit-pool/code-generation/fixed-workload.ts`（SHA-256 `d10e9e8fcd42f845f5ff42a2148f8081be2f2ec5aeae2595a34be1a606f4472c`）を使用する。

```bash
bun amadeus/spaces/default/intents/260802-codex-duration-bounds/construction/bounded-unit-pool/code-generation/fixed-workload.ts \
  --mode treatment \
  --repo /Users/j5ik2o/.codex/worktrees/d6f3/amadeus \
  --warmup 3 \
  --measured 20
```

workload IDは `codex-duration-bounds/four-independent-units/v1`、input digestは `sha256:58f36fdd5015228b692f06892e9e57a4a4368314b1785cfcacc474557f3403c7`。4個の独立Unitを各20msのfake workerで成功させる。

## 比較と解釈

control `906612bddeed6b46ede1991ab83be8682c7e50cc` はmedian 21.916ms、p95 22.196ms、maximumActive 4。treatment `a8e1ce025a918310ab7d803270bb6fc6b649c598` はmedian 43.176ms、p95 44.839ms、maximumActive 2である。cap 2は2 waveになるためsynthetic elapsed timeが約2倍になるが、これは欠陥ではなく同時実行資源を2へ制限した直接結果である。

最新main `11fc8a7206c2b6960d122ef7cd99ef404fd846ce` でもmedian 44.884ms、p95 48.119ms、maximumActive 2、各Unit attempt 1、queue order `u0,u1,u2,u3`、termination `completed` を確認する。

## 合格基準

warmup 3、測定20の全runでmaximumActive ≤ 2、attempt数各1、FIFO queue順、completed、forbidden event field 0を満たすこと。host差に依存する絶対ms gateは設定せず、capacityと停止性をblocking predicateとする。
