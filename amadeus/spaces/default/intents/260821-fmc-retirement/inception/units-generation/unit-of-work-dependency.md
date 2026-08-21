# Unit Dependency — 260821-fmc-retirement

上流入力: `unit-of-work.md`、`application-design/component-dependency.md`。

## 依存グラフ(機械可読 edge block — 契約必須)

```yaml
units:
  - name: fmc-retirement
    kind: packaging
    depends_on: []
```

単一 unit(U1: fmc-retirement)のため unit 間依存は存在しない。**Parallel development opportunities: N/A(単一 unit)。Stories spanning multiple units: N/A(全ストーリーが U1 へ帰属)。**unit 内の作業順序は `application-design/component-dependency.md` の直列 8 段(合成 fixture 新設 → テスト差し替え → O-5 代替 → 本体削除 → 設定/CI → 再生成 → docs → 検証)を正とする。

## 着地後アクションの依存

```
U1 着地(PR マージ + 実読検証)
  → FR-NORM-1(単独ノルム PR)
  → FR-ISS-1(Issue クローズ)
```

FR-NORM-1 と FR-ISS-1 は相互独立(並行可)。いずれも U1 着地が前提(close-after-landing-verification)。
