# Unit Dependency — metrics-observation

```
U1 (seam) ──出力契約──> U2 (CLI) ──実行対象──> U3 (CI job)
```

- U1 → U2: U2 の tests collector は U1 の出力(tests-totals.json)を読む。**契約(ファイル名・4キー)は design で固定済み**のため、U1/U2 は c6 非交差(run-tests.ts vs scripts/)なら並行実装可 — 統合検証は U1 着地後。
- U2 → U3: U3 は U2 の CLI を呼ぶため U2 着地後に着手(直列)。
- 実行順: **W1 = U1 ∥ U2 → W2 = U3**(並行度2以内、builder ≤4 制約内)。
