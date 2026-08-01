# Unit of Work — Dependency DAG

上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`（参照済み）

本書はトポロジのみを記述する。実装順序・優先度・クリティカルパスの特定は delivery-planning（2.8）の領域。

## 依存エッジ

| Unit | depends on | 依存の種類 |
|---|---|---|
| U1 otel-walking-skeleton | （なし） | — |
| U2 event-registry | U1 | emit 経路（Provider）が前提 |
| U3 journal-v2 | U1 | なし（並行可能だが U1 合格が hard gate のため事実上後続） |
| U4 local-exporters | U1, U2, U3 | Registry 受理集合の検証と schema v2 codec が前提 |
| U5 context-propagation | U1 | Context 基盤が前提 |
| U6 journal-reader-swap | U3 | v1/v2 reader が前提 |
| U7 callsite-migration | U4 | 本番 Exporter が前提 |
| U8 legacy-writer-removal | U7 | call site ゼロが前提 |
| U9 metrics-subset | U1, U4 | hardened LocalMetricExporter が前提 |
| U10 diagnostic-logs | U1, U4 | hardened LocalLogExporter が前提 |
| U11 otlp-relay | U7 | shadow 比較（移行期間）の完了が前提 |

```yaml
units:
  - name: otel-walking-skeleton
    depends_on: []
  - name: event-registry
    depends_on: [otel-walking-skeleton]
  - name: journal-v2
    depends_on: [otel-walking-skeleton]
  - name: local-exporters
    depends_on: [otel-walking-skeleton, event-registry, journal-v2]
  - name: context-propagation
    depends_on: [otel-walking-skeleton]
  - name: journal-reader-swap
    depends_on: [journal-v2]
  - name: callsite-migration
    depends_on: [local-exporters]
  - name: legacy-writer-removal
    depends_on: [callsite-migration]
  - name: metrics-subset
    depends_on: [otel-walking-skeleton, local-exporters]
  - name: diagnostic-logs
    depends_on: [otel-walking-skeleton, local-exporters]
  - name: otlp-relay
    depends_on: [callsite-migration]
```

## 統合ポイント

- U2 ↔ U4: Registry の受理集合と Exporter の dispatch 先（4 集合一致の2頂点）
- U3 ↔ U4: schema v2 codec を AuditLogExporter が利用
- U4 ↔ U7: migration-adapter 経由の emit 委譲
- U7 ↔ U11: shadow 比較ハーネス（新旧 Signal の機械可読 report）
- U5 は全 Unit の Context 基盤（横断）

## 並行開発の機会

- U1 完了後: {U2, U3, U5} は互いに独立（複数の有効なトポロジカル順序が存在）
- U2＋U3 完了後: U4 が、U3 完了後: U6 が加わり独立に進められる
- U4 完了後: {U7, U9, U10} が独立に進められる
