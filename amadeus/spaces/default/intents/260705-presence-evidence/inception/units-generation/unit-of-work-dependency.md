# Unit of Work Dependency — Presence Evidence（260705-presence-evidence）

上流入力: [unit-of-work.md](unit-of-work.md)、[component-dependency.md](../application-design/component-dependency.md)

## 依存トポロジー

```yaml
units:
  - name: u001-presence-evidence
    depends_on: []
```

## 注記

- 本文書はトポロジーのみを扱う。実行順は delivery-planning で確定する。
- 外部接触は parity-map.json の追記型接触（#428）のみ。着手前ピア確認は component-dependency.md の手順に従う。
