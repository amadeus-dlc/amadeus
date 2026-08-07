# Unit of Work Dependency — 260807-merged-pr-convergence

上流入力(consumes 全数): `unit-of-work.md`(本ステージ姉妹成果物 — 単一 Unit 定義)、`component-dependency`(依存方向)、`requirements` / `components` / `component-methods` / `services` / `decisions`(単一 Unit 編成の導出元 — unit-of-work.md の正当化節に集約)。

## 依存グラフ

単一 Unit のため Unit 間依存なし。

```yaml
units:
  - name: landed-report
    kind: service
    depends_on: []
```

## バッチ構成

Batch 1 = [landed-report](唯一)。並行度 1。walking-skeleton stance により Bolt 1 は gated(self-feature Mandated)。
