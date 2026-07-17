# Unit of Work Dependency — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../application-design/components.md`(C1〜C7)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(実装順序)、`../application-design/decisions.md`(ADR-1〜4)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US・MoSCoW)。

## 依存グラフ(単一 unit — エッジなし)

```yaml
units:
  - name: installer-enum-extension
    depends_on: []
```

単一 unit のため Bolt 間依存なし。unit 内の実装順序は component-dependency.md(C1→C2→C3→C4→C5 / C6 / C7)に従う。

- Integration points between units: 該当なし(単一 unit)
- Parallel development opportunities: 該当なし(単一 unit — unit 内も同一検証列に閉じるため直列)

## 機械検証

`bun .claude/tools/amadeus-runtime.ts compile` → runtime-graph.json の bolt_dag = 1 unit / 1 batch を実測確認(per-unit-loop-activation)。
