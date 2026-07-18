# Unit of Work Dependency — 260717-state-mirror-fixes

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## 依存関係

U1(core 面)と U2(scripts 面)は編集ファイル・再生成面ともに完全非交差(component-dependency.md の非交差表)— 実装依存なしで並行可。以下が downstream batch fan-out の正本(parseBoltDag 用 edge block — per-unit-loop-activation (a))。

```yaml
units:
  - name: fix-1170-retreat-guard
    depends_on: []
  - name: fix-1172-skip-denominator
    depends_on: []
```

## 直列制約

実装レベルの直列制約なし(両 unit 並行可、c6 非交差判定済み)。検証レベルの順序制約1点: U2 の live 18/18 実測(A-3)は C4 state 修復(conductor 執行の record checkpoint)後に行う — unit テスト(fixture ベース)はこの制約に依存しない。
