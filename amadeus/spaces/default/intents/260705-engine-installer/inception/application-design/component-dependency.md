# Component Dependency — Engine Installer（260705-engine-installer）

上流入力: [components.md](components.md)、[component-methods.md](component-methods.md)

## 依存関係（実行順）

```text
cli
 └─ preflight
 └─ manifest ──────────────┐
 └─ copyEngine      ← [1/5]│
 └─ placeAmadeusMd  ← [1/5]│（copyEngine の直後に実行。transformAmadeusMd を内部で適用）
 └─ copySkills      ← [2/5]│ すべて manifest を参照
 └─ relinkClaude    ← [3/5]│
 └─ mergeSettings   ← [4/5]│
 └─ smoke           ← [5/5]┘
```

- 工程は直列実行であり、途中のエラー中断は以降の工程を実行しない（FR-1.8: 適用済み工程は残存、再実行で収束）。
- eval harness → cli（実行）と manifest（レイアウト検査）に依存する。逆方向の依存はない（インストーラは eval を知らない）。
- 並行 Intent との接触面: manifest がエンジンレイアウトの唯一の宣言点であり、レイアウト変更時は manifest と eval の一致検査（FR-2.5）が先に fail して検知する（R-1）。
