# Functional Design 質問 — election-canonical-schema

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。対象はU1のcanonical type/codecだけで、tally business rule、filesystem、CLI transitionは後続unitに属する。

## Q1: legacy/new schemaをどう判別するか？

- A. `schemaVersion: 2`をv2の必須discriminantとし、versionなしscalar shapeだけをlegacyとして受理する。hybrid/unknown versionは拒否
- B. `questions` fieldの有無だけで判別する
- C. try/catchでv2→legacyの順に推測する
- D. file pathで判別する
- E. unknown versionをv2として受理する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。曖昧入力をfail-closedにし、将来versionをsilent acceptしない）

## Q2: question IDを正規化するか？

- A. whitespace-onlyを拒否し、受理した文字列はtrim/lowercaseせずexactに保存する
- B. trimして保存する
- C. lowercaseへ変換する
- D.質問文hashへ置換する
- E.配列indexへ置換する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。definition authorのstable identityを黙って変更しない）

## Q3: decoderはunknown fieldをどう扱うか？

- A. 各versionのfield whitelist外を拒否する
- B. silent dropする
- C.すべてpreserveする
- D. warningだけ出す
- E. top-levelだけ許可する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。semantic fieldのsilent lossを防ぎ、schemaVersionで拡張する）

## Q4: legacy tallyのrunIdをどう補うか？

- A. canonicalized legacy tally bytesのdomain-separated SHA-256から決定的に生成する
- B.読込時刻を使う
- C. file pathを使う
- D. UUIDを毎回生成する
- E.空文字にする
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。再読込・migration前後で同じidentityを得る）

## Q5: canonical digestは何を対象にするか？

- A. definition順に正規化したestablished resultsだけをdomain-separated canonical identity helperへ渡す
- B. JSON.stringifyの偶然のkey順を使う
- C. record Markdownをhashする
- D. hold resultsもpreserved digestへ含める
- E. file metadataを含める
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。rerunで変化可能なholdを除き、preserve対象だけを固定する）
