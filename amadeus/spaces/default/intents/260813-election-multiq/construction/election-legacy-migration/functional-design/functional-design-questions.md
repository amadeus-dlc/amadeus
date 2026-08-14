# Functional Design 質問 — election-legacy-migration

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。

## Q1: migration fidelityは何で比較するか？

- A. 移動前後をU1/U3でcanonical decodeしたaggregate digest
- B. raw bytes
- C. file path
- D. record行数
- E. mtime
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。意味互換を検証する）

## Q2: schemaを同時変換するか？

- A. しない。directory/registry moveとdual-read fidelityだけ
- B.全fileをv2へ上書き
- C. ledgerだけ変換
- D. tallyだけ変換
- E.自動起動時変換
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。append-only/read-only契約を守る）

## Q3: apply前のguardは？

- A. dry-run plan、explicit target、approval、dirty/conflict check
- B.確認なし
- C. glob全件
- D. source削除先行
- E. registryだけ更新
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。破壊的対象を限定する）
