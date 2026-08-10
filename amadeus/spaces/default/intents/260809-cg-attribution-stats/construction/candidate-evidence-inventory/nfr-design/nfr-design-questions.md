# NFR Design Questions — candidate-evidence-inventory

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-38b48a131dbe071a0f9efc7c102b4ee2`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。`business-logic-model.md`がreadonly corpus、Event Set検証順、全finding収集後のfixed precedence、closed family classifier、決定的grouping、candidate単位fail-closedを確定している。Requirements AnalysisのNFR-2・NFR-3・NFR-5〜7とApplication DesignのC-03境界から、securityとlogical component設計は一意に導出できる。

## Upstream applicability and ambiguity analysis

- `business-logic-model.md`だけがengine directiveのpresent consumeであり、未決のresilience、scale、security、component isolation事項はない。
- `security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentであり、Requirements Analysis NFR節とaccepted Application Designを代替正本にする。
- `performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitでは非適用で、対応design outputもengineがpruneしている。

## Evidence

- `requirements.md:287-309`がdeterminism、fail-closed、current-corpus scale、maintainability、read-only safetyを規定する。
- `components.md:77-97`がC-03のdecoder、classifier、grouper、evaluatorと禁止された推定を規定する。
- `business-logic-model.md`がouter envelope failureを1 candidateとして保持し、raw inputをrepairしない処理を固定する。
