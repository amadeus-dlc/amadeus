# NFR Design Memory

## Interpretations

- 2026-08-10T14:48:00Z — self-featureはNFR Requirementsをexpected skipするため、present business-logic-modelだけを入力にし、上流identifierを新設しない。
- 2026-08-10T14:48:00Z — library Unitではdirectiveが指定するsecurity-designとlogical-componentsだけを生成し、performance/scalability/reliabilityのN/A成果物を作らない。
- 2026-08-10T14:51:00Z — U2も同じlibrary kind契約を適用し、指定2成果物だけを生成する。

## Deviations

- なし。

## Tradeoffs

- 2026-08-10T14:48:00Z — 新しいsecurity infrastructureを追加せず、pure projectionの入力validationと既存audit/authority境界でblast radiusを限定する。
- 2026-08-10T14:51:00Z — 未解決`{unit-name}`の検証は限定fan-out経路へ閉じ、汎用path hardeningや正当なplaceholderを扱う別経路へ一般化しない。

## Open questions

- なし。
