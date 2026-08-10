# Code Generation Plan — numeric-provenance-mapping-contract

## 目的と境界

U1はcanonical kind `spec` として、U2がconsumed-in-placeで利用する静的なmapping schema、承認fixture、受け入れテストだけを実装する。実行可能なDesign-time Artifact Index / sweep generator、機械生成sweep report、生成TypeScript mapping、sensor runtime / manifest / stage frontmatter配線はU2所有のため、本計画では作成・変更しない。

入力は `requirements.md`、Application Design全成果物、`unit-of-work.md`、`unit-of-work-story-map.md`、当UnitのFunctional Design / NFR Design全成果物である。正式なUser Stories成果物は存在しないため、`unit-of-work-story-map.md` のDS-1〜DS-6をtrace単位として用いる。DepthはStandard、Test StrategyはComprehensiveであるが、U1は静的specでありruntime・network・database・UIを持たないため、schema/fixtureを実読するintegration contract testに検証を集中する。

## 実装手順

- [x] **Step 1: schema/fixture contract testを先に追加してRedを確認する。** `tests/integration/numeric-provenance-mapping-contract.integration.test.ts` を追加し、schema revision、固定claim/provenance集合、Design-time Artifact Index入出力、sample identityと二値label、lower/upper-bound saturation、mode/searchScope、wired stage集合、approval digest形を検証する。存在しないschema/fixtureを読む失敗（exit 1、ENOENT）でRedを実測した。Trace: FR-PRED-1〜4、FR-SWP-1〜4、FR-TST-3〜4、DS-1〜4/6、BR-U1-01〜09。
- [x] **Step 2: 実行コード非依存のJSON Schemaを追加する。** `packages/framework/core/amadeus-common/contracts/numeric-provenance-mapping-contract.schema.json` に、固定語彙、CorpusSnapshot、ArtifactDescriptor discriminated union、SampleIdentity/LabeledSample、ClassificationEvidence、ArtifactPolicy、MappingApproval、Design-time Artifact Index入出力をclosed schemaとして定義した。runtime fallback、generator、TypeScript mappingは含めていない。JSON parseはexit 0。Trace: FR-PRED-1〜4、FR-SWP-1〜4、DS-1〜5、domain-entities.md、security-design.md。
- [x] **Step 3: 承認済みsynthetic fixtureと境界caseを追加してGreenへ戻す。** `tests/fixtures/numeric-provenance-mapping-contract/approved-mapping.fixture.json` に30件の完全label、20件のprovenance-positive距離、`W = max(nearest-rank p95, min + 1)`、lower-bound saturation enforcement、upper-bound saturation measurement-only、scan-only codekb非投影、wired stage集合、quality-agent approvalを固定した。sample identity、理由、canonical digest chainを再計算するfocused testは8 pass / 0 fail。Trace: FR-SWP-1〜4、FR-TST-3、DS-4/6、BR-U1-04〜09。
- [x] **Step 4: 対象テストとrepository gateを収束させる。** 対象integration test、`bun run lint`、`bun run typecheck`、`bun run test:ci`を実行し、全コマンドexit 0を実測して`code-summary.md`へ記録した。diff上、U2/U3所有面の変更は0件。Trace: FR-TST-3〜4、NFR-4、DS-4/5。
- [x] **Step 5: code-summaryを日本語で作成し、計画checkboxを完了状態へ同期する。** 作成/変更ファイル、主要判断、要件trace、テスト結果、計画逸脱、残課題を記録した。Trace: DS-4、Code Generation stage contract。

## Requirement / scenario traceability

| 要件・scenario | schema / fixture | 受け入れtest |
| --- | --- | --- |
| FR-PRED-1〜4 / DS-1〜3 | 固定4 claim class、provenance kind、機械除外、lightweight exact set、構造領域 | enum/const集合と境界fixtureの完全一致 |
| FR-SWP-1 / DS-4 | snapshot、artifact index、sample identity、二値label | source discriminator、SHA-256再計算、全label/reason |
| FR-SWP-2 / DS-4/6 | distance multiset、nearest-rank p95、mode、searchScope | lower saturationの`W=1`/95%/strict interior、upper saturationのmeasurement-only |
| FR-SWP-3〜4 / DS-4/5 | policy、wired stage集合、approval digest chain | policy集合・stage集合・approval role/verdict/digest形式 |
| NFR-4 | JSON/標準Bunだけの静的spec | dependency/設定追加なし、typecheck/lint |

## Test configuration

- 既存Bun test runner、`tsconfig.tests.json`、Biome設定をそのまま使用し、新しいtest runner・dependency・package scriptは追加しない。
- committed schema/fixtureをfilesystemから読むためintegration層へ置き、`// size: medium`を宣言する。
- U1にはruntime/E2E/performance実装がない。性能・security runtime検証、t532 sensor integrationはU2、build配送検証はU3が所有する。
