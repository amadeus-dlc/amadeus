# Unit of Work Dependency — amadeus-mirror ツール

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## 依存関係

単一 unit のため unit 間依存なし。以下が downstream batch fan-out の正本(parseBoltDag 用 edge block — per-unit-loop-activation (a))。

```yaml
units:
  - name: amadeus-mirror-cli
    depends_on: []
```

## 直列制約

なし(単一 Bolt)。
