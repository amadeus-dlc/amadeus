# Domain Entities — formal-election-multiq

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) をformal entityへ写像する。

## Formal mappings

| TypeScript concept | TLA+ representation |
|---|---|
| QuestionId | element of `Questions` |
| question-owned choices | function `Choices[q]` |
| voter×question response | partial function `accepted[v][q]` |
| QuestionResult | `results[q]` record |
| targetQuestionIds | subset `targets` |
| established subset | function restriction `preserved` |
| lifecycle | `phase ∈ {Collecting,Partial,Tallied}` |

## ModelReceipt

model name、module/cfg identities、aux identities、implementation identities、TLC version、constants、outcome、stats、completion markerを持つ。source identityとcurrent model-mapが一致するreceiptだけを完了証拠にする。

## Counterexample

invariant name、state sequence、violating question/voter、target/preserved snapshotsを保持する。`NOT_DETECTED`だけをsuccessとし、tool error/partial runをsuccessへ丸めない。

## Ownership

U7はformal abstractionとidentity bindingを所有する。production tally algorithmはU2、CLI transitionはU5が所有し、model-mapが対応関係を拘束する。
