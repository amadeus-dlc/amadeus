# Unit Dependency — metrics-observation

```
U1 (seam) ──出力契約──> U2 (CLI) ──実行対象──> U3 (CI job)
```

- U1 → U2: U2 の tests collector は U1 の出力(tests-totals.json)を読む。**契約(ファイル名・4キー)は design で固定済み**のため、U1/U2 は c6 非交差(run-tests.ts vs scripts/)なら並行実装可 — 統合検証は U1 着地後。
- U2 → U3: U3 は U2 の CLI を呼ぶため U2 着地後に着手(直列)。
- 実行順: **W1 = U1 ∥ U2 → W2 = U3**(並行度2以内、builder ≤4 制約内)。

## 機械可読 DAG(required-sections センサー要求様式)

```yaml
units:
  - id: U1
    depends_on: []
  - id: U2
    depends_on: []   # U1 と並行可(出力契約は design 固定済み。統合検証は U1 着地後)
  - id: U3
    depends_on: [U2]
edges:
  - from: U1
    to: U2
    type: contract   # tests-totals.json の4キー契約(ファイル境界の疎結合)
  - from: U2
    to: U3
    type: execution  # U3 は U2 の CLI を実行
```
