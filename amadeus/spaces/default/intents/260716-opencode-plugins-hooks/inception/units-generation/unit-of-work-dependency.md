# Unit of Work Dependency — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../application-design/components.md`(C1〜C5)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(直列依存)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜5)、`../user-stories 非実行(amadeus スコープ)につき story 面は requirements のトレース表を正とする`。

## 依存グラフ(単一 unit — エッジなし)

```yaml
units:
  - name: opencode-plugin-adapter
    depends_on: []
```

単一 unit のため Bolt 間依存なし。unit 内の実装順序は component-dependency.md(C3→C2→C1→C4→C5、工程0 先行)に従う。

- Integration points between units: 該当なし(単一 unit)
- Parallel development opportunities: 該当なし(工程0 の凍結が後続の入力になる直列)

## 機械検証

compile 実測+bolt_dag 非 null 確認は本ステージ完了時に実施(E-APG-FD 第3条件の先行適用 — 結果はゲート報告に添付)。
