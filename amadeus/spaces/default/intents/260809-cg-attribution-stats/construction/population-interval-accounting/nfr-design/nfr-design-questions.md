# NFR Design Questions — population-interval-accounting

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-38b48a131dbe071a0f9efc7c102b4ee2`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。`business-logic-model.md`がfinite safe integerの半開区間、同一intent/stage限定、idle差引、candidate単一disposition、category/global union、fail-closed invariant transaction、決定的順序と複雑度を確定している。Requirements AnalysisのNFR-1〜3・5〜7からsecurityとlogical component設計を一意に導出できる。

## Upstream applicability and ambiguity analysis

- `business-logic-model.md`だけがengine directiveのpresent consumeであり、未決のfailure containment、scale、security、component isolation事項はない。
- `security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentで、Requirements Analysis NFR節とaccepted Application Designを代替正本にする。
- `performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitでは非適用で、対応design outputもengineがpruneしている。

## Evidence

- `requirements.md:283-309`がaccounting correctness、determinism、fail-closed、current-corpus scale、maintainability、read-only safetyを規定する。
- `components.md:99-117`がC-04のinterval algebra、population-wide disposition、恒等式と禁止境界を規定する。
- `business-logic-model.md`が部分結果を返さないsingle invariant transactionとO(cw + k log k)上限を固定する。
