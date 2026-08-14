# Functional Design 質問 — election-record-transport

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。U4はquestion-aware record/verifyと意味を解釈しないdelivery portを所有する。

## Q1: recordのprimary groupingは何か？

- A. definition順のquestion ID section。各sectionにruling/counts/GoA/reservations/holdを置く
- B. voter順だけ
- C. GoA順だけ
- D.単一global ruling
- E. arrival順だけ
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。question attributionとdeterminismを守る）

## Q2: self verificationは何と何を比較するか？

- A. ledger/materialized/current/history/recordの独立sourceを再計算して比較する
- B. recordをrecord自身と比較する
- C. current tallyだけを見る
- D. Markdown行数だけ
- E. warningだけ
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。verification theatreを避ける）

## Q3: transport APIをquestionごとに増やすか？

- A. 増やさない。voterごと1 view pathのまま、view内容をquestions[]へ拡張する
- B. questionごとに通知する
- C. response内容を通知本文へ埋め込む
- D. peer statusを含める
- E.新HTTP APIを作る
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。既存portとblind independenceを維持する）

## Q4: mixed recordのglobal summaryはどうするか？

- A. established/hold件数とheld IDsを要約し、各question sectionを正本とする
- B. worst resultへ丸める
- C.最初のholdだけ表示
- D. summaryを正本にする
- E. mixedを表示しない
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。scannabilityと完全性を両立する）
