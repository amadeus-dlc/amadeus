# §13 学習候補(units-generation, 260724-harness-provenance)

## 提案: 0件

## 検討した候補と不採用理由

- **edge block の units キーは `id:` でなく `- name:`(初回誤記で required-sections が edge_block:malformed で FAIL)**: parseUnitsBlock(`amadeus-lib.ts:7205` の `- name:` 期待)の様式知識であり、既存 cid:units-generation:per-unit-loop-activation(edge block 必須)の運用詳細に属する。新規 cid には当たらず、キー名の正解はコード(parseUnitsBlock)が唯一の真実源であるため、prose ノルム化するとむしろ drift リスクになる。実行時ミスをセンサー(required-sections の edge_block 検査)が正しく捕捉した好例。
- **consumes の services.md を本文未参照の装飾トークンにした→architecture-reviewer が捕捉→是正**: 既存 cid:code-generation:artifact-upstream-inputs-header(参照実体のない装飾トークン禁止)・cid:nfr-design:body-derivation-before-header で完全にカバー済み。N/A 成果物(サービス層なし)を consumes に持つステージで実参照文を書く必要があるという運用は既存ノルムの範囲。新規性なし。

## 実測根拠

- architecture-reviewer: iteration 1 NOT-READY(Major: services.md 装飾トークン、Minor: AC-1d 転記漏れ)→ 是正 → iteration 2 READY(全 file:line・引用整合を確認)。
- edge block: required-sections センサー FAIL(edge_block:malformed)→ `- name:` へ是正 → PASS → `bun amadeus-runtime.ts compile` で bolt_dag 非 null(batches: [[harness-detector],[harness-recorder]])を確認。
