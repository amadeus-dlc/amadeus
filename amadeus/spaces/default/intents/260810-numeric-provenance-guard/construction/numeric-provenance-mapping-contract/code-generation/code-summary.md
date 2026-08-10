# Code Summary — numeric-provenance-mapping-contract

## 実装概要

U1 `numeric-provenance-mapping-contract` の静的specとして、U2がconsumed-in-placeで参照できるclosed JSON Schema、品質承認済みsynthetic fixture、契約受け入れテストを追加した。実行可能なDesign-time Artifact Index / sweep generator、機械生成sweep report、生成TypeScript mapping、sensor runtime / manifest / stage frontmatter配線は変更していない。

## 作成ファイル

- `packages/framework/core/amadeus-common/contracts/numeric-provenance-mapping-contract.schema.json`
  - schema revisionとpredicate revisionを固定したDraft 2020-12 schema。
  - count / ratio / percentage / measured-valueのclaim class、command-token / measurement-reference / hex-sha / relative-linkのprovenance kindを固定した。
  - CorpusSnapshot、Design-time Artifact Index入出力、artifact descriptor discriminated union、sample identity、二値label、classification evidence、policy、mapping、approvalをclosed objectとして定義した。
- `tests/fixtures/numeric-provenance-mapping-contract/approved-mapping.fixture.json`
  - 30件の完全labelと20件のprovenance-positive距離を持つ承認fixture。
  - lower-bound saturationとupper-bound saturation、codekb scan-only、stage/record-relative patternからproduces keyへの写像、quality-agent承認を固定した。
  - authority / snapshot / mapping / receiptのcanonical SHA-256 digest chainを実データから再計算可能な形で収録した。
- `tests/integration/numeric-provenance-mapping-contract.integration.test.ts`
  - schemaとfixtureの閉包性、固定語彙、index discriminator、sample identity、二値label、nearest-rank p95、mode/searchScope、mapping、wired stage、approval digest chainを検証する9件のintegration contract test。
  - dependency追加を避けるため、U1で必要なJSON Schema subsetだけを検証するtest-local validatorを使用した。
- `amadeus/spaces/default/intents/260810-numeric-provenance-guard/construction/numeric-provenance-mapping-contract/code-generation/code-generation-plan.md`
  - TDD順序、実装境界、traceability、test configurationを記録した。

## 主要判断

1. schemaはruntime実装から独立した配布元 `amadeus-common/contracts` に置き、U2が静的契約を直接消費できるようにした。
2. Design-time Artifact Indexの入力と出力をmappingから分離し、declared artifactとcodekb re-scanのscan-only discriminatorをschemaで固定した。
3. 承認fixtureはsynthetic corpusに限定し、30分以上の二値label、20件以上のpositive sample、false-positive rate上限10%を機械検証可能にした。
4. `W = max(nearest-rank p95, min + 1)` のlower-bound saturationは`W=1`かつ19/20 coverageのenforcement、upper-bound saturationは`p95=max`のためmeasurement-onlyとなる境界を固定した。
5. U2/U3所有面を変更せず、静的contractの意味と承認証跡だけをU1へ閉じ込めた。
6. 区切りなし`relativePath + line + normalizedText`が異なるtupleを同一preimageへ写す欠陥を修正し、sample identityをUTF-8 `JSON.stringify([relativePath,line,normalizedText])`（空白なし・要素順固定）のlowercase hex SHA-256へ変更した。承認fixtureの30 identitiesとauthority / mapping / receipt digest chainは新しいpreimageから再計算した。

## 要件traceability

| 要件・scenario | 実装・検証 |
| --- | --- |
| FR-PRED-1〜4 / DS-1〜3 | 固定claim/provenance集合とclosed schema、完全一致test |
| FR-SWP-1 / DS-4 | snapshot/index/sample identity/二値label、SHA-256再計算test |
| FR-SWP-2 / DS-4/6 | nearest-rank p95、lower/upper saturation、mode/searchScope test |
| FR-SWP-3〜4 / DS-4/5 | policy、wired stage集合、quality-agent approval、digest chain test |
| FR-TST-3〜4 / NFR-4 | Red→Greenのfocused integration test、依存追加なし、repository gate |

## 検証結果

- TDD Red: `bun test tests/integration/numeric-provenance-mapping-contract.integration.test.ts` — exit 1（schema未作成による`ENOENT`）。
- JSON parse: `bun -e 'JSON.parse(await Bun.file(...).text())'` — exit 0。
- Identity correction Red: 同一pathの`[5,"10件"]`と`[51,"0件"]`を区切りなし連結した旧preimageの衝突caseを追加し、旧schema式とfixture identityを検出してexit 1、7 pass / 2 fail。
- Focused test: `bun test tests/integration/numeric-provenance-mapping-contract.integration.test.ts` — exit 0、9 pass / 0 fail、4472 expect calls。
- Focused Biome: `bunx biome check tests/integration/numeric-provenance-mapping-contract.integration.test.ts` — exit 0、diagnosticなし。
- Typecheck: `bun run typecheck` — exit 0。
- Lint: `bun run lint` — exit 0。既存baselineの457 warnings / 17 infosのみで、新規testのfocused checkはclean。
- Full CI test: `bun run test:ci` — exit 0、962 files / 12929 assertions、failed files 0 / failed assertions 0、RESULT PASS。Claude substrate依存テストはrunner契約どおりskip。

## 計画逸脱

なし。fresh worktreeに`dist/`が存在しなかったため、検証前提を整える目的で`bun install --frozen-lockfile`と`bun run build`を実行したが、生成物はcommit対象外である。

## 残課題

- U2: schema/fixtureをconsumed-in-placeで読む実行可能なDesign-time Artifact Index、sweep generator/report、生成mapping、runtime sensor / manifest / stage frontmatter配線を実装する。
- U3: build配送面の包含と生成物driftを検証する。
