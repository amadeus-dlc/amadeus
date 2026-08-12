# Unit of Work Dependency — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(FR 間依存が単一 Unit 内で閉じることの確認)、components.md・component-methods.md(コンポーネント間依存 = Unit 内部依存)、services.md(実行単位が独立プロセスで他 Unit 通信なし)、component-dependency.md(依存マトリクスの Unit 集約)、decisions.md(ADR-1 が外部分岐依存を消したことの反映)

## 依存 DAG

単一 Unit のため Unit 間依存は存在しない。

```yaml
units:
  - name: control-byte-gate
    kind: service
    depends_on: []
```

## 依存の説明

- U1 (control-byte-gate) は独立 Unit(depends_on: [])。Unit 内部の実装順序(述語 → CLI → CI 配線 → 落ちる実証)は delivery-planning の Bolt 計画が所有する。
