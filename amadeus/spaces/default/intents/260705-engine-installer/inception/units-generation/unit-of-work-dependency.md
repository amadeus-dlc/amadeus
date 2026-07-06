# Unit of Work Dependency — Engine Installer（260705-engine-installer）

上流入力: [unit-of-work.md](unit-of-work.md)、[component-dependency.md](../application-design/component-dependency.md)

## 依存トポロジー

単一 Unit（u001-engine-installer）のため、Unit 間依存は存在しない。

```yaml
units:
  - name: u001-engine-installer
    depends_on: []
```

## 注記

- 本文書はトポロジーだけを扱う。Bolt の出荷順・economic sequencing は delivery-planning（2.8）で確定する。
- Unit 内部の工程直列（cli → preflight → copyEngine → placeAmadeusMd → copySkills → relinkClaude → mergeSettings → smoke）は component-dependency.md が正であり、本文書では再定義しない。
- 外部依存: なし（並行 Intent との接触は package.json / eval の追記型接触のみ = CON-8）。
