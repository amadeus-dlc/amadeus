# Functional Design 質問 — formal-election-multiq

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。

## Q1: modelのstate粒度は？

- A. voter×question accepted、question result、target/preserved集合
- B. Election全体の単一accepted/result
- C. record prose
- D. filesystem path
- E. CLI文字列
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。実装不変量へ直接対応する）

## Q2: 必須invariantは？

- A. ID一意、response範囲、result完全性、established不変、held-only target
- B. terminal到達だけ
- C. winner存在だけ
- D. path一意だけ
- E. performanceだけ
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。FR-FML-1を完全被覆する）

## Q3: identity更新は？

- A. spec/cfgと全implementation surfacesをmodel-mapへ同時反映
- B. specだけ
- C. cfgだけ
- D.手書き固定hash
- E.省略
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。driftを防ぐ）
