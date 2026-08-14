# Functional Design 質問 — election-question-tally

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。U2はpureなresponse resolution/tally/preservation policyだけを所有する。

## Q1: amend resolutionのkeyは何か？

- A. `(voter, questionId)`。receivedAt優先、同値はappend順の後勝ち
- B. voterだけ
- C. questionIdだけ
- D. submittedAtだけ
- E. ballot file名
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。既存receipt axisをquestion粒度へ拡張する）

## Q2: rerun tallyは何を入力にするか？

- A. target hold IDs、preserved established results、expected preserved digestを明示入力にする
- B.全questionを毎回再集計する
- C. record proseからestablishedを復元する
- D.最初のholdだけを対象にする
- E.人間がquestion textを指定する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。target/preservedを型境界で分離する）

## Q3: mixed lifecycleをどう導出するか？

- A. holdが1件以上なら`partial`、全result establishedなら`tallied`
- B.最悪GoAへ丸める
- C.1件でもholdなら全体結果を破棄する
- D. questionごとに別Electionを作る
- E. record rendererが決める
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。global lifecycleとquestion resultを分離する）

## Q4: early/late判定の境界は何か？

- A. questionごとに判定し、receipt timeと当該questionのtalliedAtを比較する
- B. Election全体で一時刻
- C. submittedAtだけ
- D. voterごと
- E. lateを無条件受理する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。established問を後着responseから隔離する）

## Q5: established preservation失敗時はどうするか？

- A. resultを返さずtyped `preservation-mismatch`でfail-closed
- B. warningだけで新resultを採用
- C.旧resultをsilent overwrite
- D. recordで後から検知
- E. retryで無視
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。store commit前にdata-safety invariantを強制する）
