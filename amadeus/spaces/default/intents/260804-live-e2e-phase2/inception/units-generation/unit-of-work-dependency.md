# Unit of Work Dependency — live E2E Phase 2

## 入力とDAG方針

DAGは [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md) を入力とする。

Unit生成時点ではcode-level topologyだけを表していた。Delivery Planning承認後、runtime graphがこのDAGをConstructionのbuild order正本として使うことが判明したため、ユーザー裁定Aの `TUI → ACP → Kimi → Evidence` と共有file contentionをdelivery admission edgeとして追記した。transportの実装契約は独立したままで、後続Unitが先行Unitのtransport証拠を流用することを意味しない。

## Machine-readable DAG

```yaml
units:
  - name: kiro-tui-live-e2e
    kind: library
    depends_on: []
  - name: kiro-acp-live-e2e
    kind: library
    depends_on: [kiro-tui-live-e2e]
  - name: kimi-print-live-e2e
    kind: library
    depends_on: [kiro-acp-live-e2e]
  - name: phase2-live-e2e-evidence
    kind: spec
    depends_on: [kimi-print-live-e2e, kiro-acp-live-e2e, kiro-tui-live-e2e]
```

## Dependency edges

| Consumer | depends on | 必要な契約 |
|---|---|---|
| `kiro-acp-live-e2e` | `kiro-tui-live-e2e` | Walking Skeleton gate承認、共有fileの着地diff |
| `kimi-print-live-e2e` | `kiro-acp-live-e2e` | ACP disposition、共有fileの着地diff |
| `phase2-live-e2e-evidence` | `kimi-print-live-e2e` | `kimi-print` registry state、contract result、green receipt |
| `phase2-live-e2e-evidence` | `kiro-acp-live-e2e` | `kiro-acp` connected/follow-up ruling、receiptまたはIssue link |
| `phase2-live-e2e-evidence` | `kiro-tui-live-e2e` | `kiro-tui` connected/follow-up ruling、receiptまたはIssue link |

TUI→ACP→KimiのedgeはConstruction admissionを直列化するdelivery constraintである。3 Unitはいずれも既存`LiveAdapter`/registry/resource/ledger contractを利用するが、ACPがTUIのproofを継承したり、KimiがACPのtransport実装へcode dependencyを持ったりはしない。

## Integration points

| Integration | Producer | Consumer | Contract |
|---|---|---|---|
| Capability row | U1/U2/U3 | U4/projector | `LiveCapability` schema、unique ID/opt-in、unsupported時Issue必須 |
| Live receipt | connectedとなったU1/U2/U3 | U4/ledger projector | adapter ID、journey ID、SHA、version、outcome、cleanup closed |
| Follow-up evidence | blockedとなったU2/U3 | U4/matrix | sanitized evidence、Issue URL、re-entry AC |
| Regression result | U1/U2/U3 | U4 | common contractと既存adapter suiteのtest verdict |

## Construction admission order

runtime graphのtopological levelは `[kiro-tui-live-e2e] → [kiro-acp-live-e2e] → [kimi-print-live-e2e] → [phase2-live-e2e-evidence]` の4段である。これはユーザー承認済みのrisk-first順と、registry・projector・serial testの共有編集をmachine directiveへ一致させるための順序である。並行化する場合はDelivery Planを再裁定し、このDAGを先に更新してruntime graphを再compileする。

## Acyclicity and coverage

- 宣言Unit: 4
- root Unit: 1
- dependent Unit: 3
- self-edge: 0
- unknown dependency: 0
- cycle: 0
- 全Unitがcanonical `kind`を1つ持つ。
