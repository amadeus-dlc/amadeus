# Delivery Planning Questions — live E2E Phase 2

> **E-OC1 証跡:** Q1はDAGから導出できない経済順序のため、ユーザー本人のHUMAN_TURNで直接裁定した。ユーザー承認タイムスタンプ: 2026-08-04T12:44:12Z（回答`1` = A、Kiro TUI risk-first）。

## Confirmed context

- 上流入力は [requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md) である。
- Unit生成時点のcode-level DAGは3 transportが独立し、`phase2-live-e2e-evidence`が全transportに依存する。ユーザー裁定後のruntime DAGには、Construction admissionを `TUI → ACP → Kimi → Evidence` とするdelivery edgeを反映する。
- self-featureの新しい検証経路であるため、最初のBoltはteam.mdのWalking Skeleton規則に従い単独・ゲート付きとする。
- Unitはtransport別vertical sliceとして実装・test・live/follow-up evidenceまで閉じるため、1 Unit = 1 Boltを維持する。
- 数値WSJFは使わず、risk reduction・value・規模を明示したqualitative hybridで順序を説明する。
- 外部依存はローカルCLI、認証・設定、モデル/provider到達性、GitHub Issue作成である。通常CIでlive processは起動しない。
- team-formationはSKIPのため、全Boltを`amadeus-developer-agent`が担当する。

## Q1. 最初のWalking Skeletonと経済順序

どの順序で4 Boltを計画しますか。

- **A. Kiro TUI risk-first（推奨）** — TUIを最大リスクのWalking Skeletonとして先にconnected/follow-upまで閉じ、次にACP、Kimi、最後に統合証跡を実施する。順序: TUI → ACP → Kimi → Evidence。
- **B. Kimi value-first** — 成立可能性が高いKimiで共通経路の価値を先に確定し、次にACP、TUI、最後に統合証跡を実施する。順序: Kimi → ACP → TUI → Evidence。
- **C. Kiro ACP balanced-risk-first** — structured protocolのACPでWalking Skeletonを成立させてからTUIへ広げ、Kimi、統合証跡へ進む。順序: ACP → TUI → Kimi → Evidence。
- **X. Other** — 別の順序またはBolt編成を指定する。

[Answer]: A — Kiro TUI risk-first（TUI → ACP → Kimi → Evidence）

## Per-Bolt planning defaults

回答後、各Boltには次を固定する。

- transport Unitのdirect/follow-up双方に対するDefinition of Done
- 実行が証明するconfidence hypothesisとexpected demo
- 1 Bolt = 1 Unit = 1 PR、独立review・rollback・verification境界
- Bolt 1承認後の並行可否は、共有file目録と先行実diffが非交差の場合だけ再評価
- `phase2-live-e2e-evidence`は3 transport Bolt完了後にのみ開始
