# NFR Design Questions — unit-iteration-and-scope-preview

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順9/12 / 正本Unit U05 `unit-iteration-and-scope-preview`。承認済みNFRと正準2 pure seamを、既存state/graph/CLIのiteration・scope preview境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU15ND1 recorded裁定 `2026-07-21T03:41:16Z`。

## 質問不要案の根拠

- Public seam: `nextConstructionStep`と`previewScopeCost`の正準2関数だけで、state、plan、graph、audit、workspaceへ書き込まない。
- Iteration: `unit-major`は明示state verbだけでopt-inし、既存Unit列を外側、compiled stage列を内側に走査する。
- Compatibility: iteration未指定時は既存stage-major resolverへ委譲し、directive、state、human/JSONのbaseline bytesを変えない。
- Invalid input: 不正iterationはstate、plan、graph、auditの最初のmutation前に既存typed failureで拒否する。
- Scope preview: 同一CompiledGridのeffective in-scope集合からstage数・gate数を一度だけ導出し、4 consumerが同じScopeSummaryを投影する。
- Projection: human表示は同値、JSONは既存field/value/orderを保ち、同値のadditive `summary`だけを追加する。

新signature、iteration vocabulary、tie-break、consumer別count、第二resolver/grid parser、invalid分類、failure/atomicity、ownership、cache/parallelism/retry、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可（推奨）— 既決契約から機械導出できる。E-USSU15ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:41:16Z`）。承認範囲は正準2 pure seam、opt-in unit-major（Unit外側・compiled stage内側）、未指定stage-major byte互換、不正値mutation前reject、同一CompiledGridからScopeSummaryを生成して4 consumerへ投影、JSON additive summaryを既決契約から機械導出する範囲に限定する。新vocabulary、tie-break、count、failure、ownership、policy、dependency、service、SLOは追加しない。
