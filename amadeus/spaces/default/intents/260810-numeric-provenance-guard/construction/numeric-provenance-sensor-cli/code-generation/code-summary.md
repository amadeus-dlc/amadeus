# Code Summary — numeric-provenance-sensor-cli

## 実装結果

単一の Bun tool module に design-time Artifact Index、Corpus Sweep、固定4 class scanner、構造境界付き provenance resolver、Generated Mapping classifier、pure evaluator、secure CLI adapter を実装した。runtime graph、dispatcher、audit schemaは変更していない。

U1 の sample identity は `JSON.stringify([relativePath,line,normalizedText])` の UTF-8 SHA-256 を使用する。旧区切りなし連結で発見した衝突は、U1 修正コミットを取り込んで解消した。

## 実測 mapping

- `bun` による sweep で8,685 files、121 declared rows、127 codekb re-scan filesを観測した。
- `bun` による50 labelsのレビュー結果は偽陽性0/50だった。
- `bun` による `code-summary/count` の距離統計は507件、`min=0, p95=0, max=2`、被覆506/507だった。
- `bun` による U1 式から W=1 を導出し、enforcement stage は `code-generation` の1件だけになった。

完全な snapshot、根拠、machine-readable mapping は `../measurements/numeric-provenance-corpus-sweep.md` に保存した。Build and Test の品質 lead が独立再計算して最終 READY receipt を付与するため、本 Unit は承認主体を代行していない。

## Runtime behavior

- missing、pre-cutoff、undatable、excluded、lightweight、unmapped は typed skip として fail-openする。
- count の enforcement claim は同一構造 region の前後 W=1 内に許可 provenance がなければ1 findingを返す。
- ratio、percentage、measured-value および非 enforcement artifact は metrics のみを返す。
- relative link は同一 intent の measurement/verification または active codekb re-scan の実在 regular fileだけを受理する。
- output path は lexical/canonical containment、regular-file性、`O_NOFOLLOW`、device/inode の pre/open/post 一致を通過した同一 descriptorから1回だけ読む。
- Generated Mapping の schema、digest、重複 key、wired stage drift は起動時に fail closedする。

## 要件 trace

| 要件 | 実装・証拠 |
| --- | --- |
| FR-SEN-1〜3 | manifest、CLI adapter、pure evaluator、JSON verdict test |
| FR-PRED-1〜5 | fixed scanner、region index、resolver、W境界の検証 |
| FR-CUT-1〜2 | cutoff constant、pre-cutoff/undatable test |
| FR-SWP-1〜4 | U1 schema/fixture、index/sweep generator、authority report、projection drift test |
| NFR-1〜4 | advisory wiring、single-process/no dependency、100KB performance test、path security controls |

## 検証

- `bun run typecheck` は exit 0。
- `bun run lint` は exit 0（repository baselineを含むwarningのみでerrorなし）。
- `bun test tests/integration/numeric-provenance-mapping-contract.integration.test.ts tests/integration/t532-numeric-provenance-sensor.integration.test.ts` は27 pass、0 fail。
- `bun test --timeout 120000 tests/integration/no-silent-drop-gate.test.ts` は48 pass、0 fail。
- `bun test --timeout 120000 tests/integration/t66.test.ts` は90 pass、0 fail。
- `bun test --timeout 120000 tests/integration/t89.test.ts tests/integration/t93.test.ts` は35 pass、0 fail。
- `bun run source-only:check` は exit 0。
- `bun packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts --stage code-generation --output-path amadeus/spaces/default/intents/260810-numeric-provenance-guard/construction/numeric-provenance-sensor-cli/code-generation/code-summary.md` は `pass:true`、`findings_count:0`。
