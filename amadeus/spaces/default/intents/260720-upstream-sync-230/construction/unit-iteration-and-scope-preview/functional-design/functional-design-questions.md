# Functional Design Questions — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1承認: 質問0件で進行可。承認TS=`2026-07-20T14:18:11Z`。

## 既決事項

- public seamは`nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep`と`previewScopeCost(scope: ScopeName, grid: CompiledGrid): ScopeSummary`である。
- `Construction Iteration: unit-major`とstate verbはopt-inで、Unitを外側、既存unit順とcompiled stage順を内側にして決定的に歩く。
- iteration未指定時は既存stage-major順と生成bytesを変更しない。不正値はstate/plan/graph/auditの全mutation前にrejectする。
- scope confirmation、intent birth、scope-change、validate-gridは、同じcompiled gridからstage数・gate数を得る。
- JSONは既存fieldを変えずadditiveな`summary`を持つ。
- U05はFR-2 items 8–9のownerで、U12は全体evidence/ledger集約だけを担う。

[Answer]: 質問0件。leaderのE-OC1承認（`2026-07-20T14:18:11Z`）により、上記既決契約から機械導出できる範囲で成果物化する。新規tie-break、consumer別count、既存bytes変更、ownership/error policy判断が必要になった場合は停止し、再付議する。

## Ambiguity analysis

- 曖昧回答: なし。
- 回答間の矛盾: なし。
- 必要情報の欠落: なし。
- 承認範囲外の判断: 追加しない。

