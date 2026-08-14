# Functional Design 質問 — election-mixed-lifecycle-cli

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。U5は9 verb、partial lifecycle、machine-readable directiveを所有する。

## Q1: partial stateの`next`は何を返すか？

- A. held[]、targetQuestionIds、preservedResultDigest、verb/report
- B.単一reasonだけ
- C. record pathだけ
- D. human proseだけ
- E.全問再実行directive
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。conductorがdirectiveだけでrerunできる）

## Q2: partial後のflowはどうするか？

- A. hold問view再配布→target coverage vote→tally→partialまたはtallied
- B.全問openから再開
- C. establishedも再投票
- D. humanがrecordを編集
- E.新Electionを作る
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。established不変性をorchestrationでも守る）

## Q3: report commitのguardは何か？

- A. expected state、runId、targets、digest、store outcomeを照合
- B. result stringだけ
- C. current file存在だけ
- D.常にadvance
- E. retryを拒否
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。stale directiveとpartial commitを拒否する）

## Q4: CLI内のpolicy配置は？

- A. command orchestrationだけ。decode/tally/store/render policyは各unitへ委譲
- B.すべてCLIへ集約
- C. recordへ集約
- D. transportへ集約
- E. generated skillへ実装
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。853行のspaghetti増殖を避ける）
