# Unit of Work Dependency — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-6)、`../application-design/component-methods.md`、`../application-design/services.md`(三経路の権限フロー)、`../application-design/component-dependency.md`(直列 C-5→C-1→C-2→C-4→C-6)、`../application-design/decisions.md`(ADR-1〜7)、`../requirements-analysis/requirements.md`(FR-1〜8)

## 依存グラフ(単一 unit — エッジなし)

```yaml
units:
  - name: standing-grant
    depends_on: []
```

単一 unit のため Bolt 間依存なし。unit 内の実装順序は component-dependency.md(C-5→C-1→C-2→C-4→C-6)に従う。

- Integration points between units: 該当なし(単一 unit)
- Parallel development opportunities: 該当なし(直列が自然な規模)

## 機械検証

UG approve 後・construction 進入前に `bun .claude/tools/amadeus-runtime.ts compile` を再実行し bolt_dag 非 null を確認する(units-generation:recompile-before-construction-bolt-dag — 結果は次ゲート報告に添付)。
