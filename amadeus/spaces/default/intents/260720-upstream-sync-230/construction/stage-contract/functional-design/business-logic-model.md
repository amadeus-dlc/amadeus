# Business Logic Model — stage-contract

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U01は、Unit kindとstage frontmatterの追加fieldを一つのcontract pipelineで検証・正規化し、graph、directive、sensor、approval guardへ同じ意味を渡す。対象はFR-2 item 7とFR-6 item 18であり、`when`は構文を保存するだけで評価しない。plugin composition、projection、Unit iterationはconsumerであり、本Unitでは所有しない。

正本は`packages/framework/core/tools/amadeus-lib.ts`の`UNIT_KINDS`/`UnitKind`と、`amadeus-stage-schema.ts`の`StageFrontmatter.produces_kinds`検証である。E-USSUFD1はlib所有を2–1で採用した。少数票はstage-schemaへの凝集を主張したが、既存`stage-schema → lib`依存とupstream `831bd29c392eff141a230e1e0501239eae132c31`同型の最小差分を優先する。

## Public seamと内部helper

公開面は`component-methods.md`の正準4関数だけであり、名前・引数・戻り値を変更しない。

```ts
function validateStageFrontmatter(raw: unknown, context: ValidationContext): ContractResult<StageFrontmatter>;
function normalizeUnitKind(raw: unknown): ContractResult<UnitKind>;
function compileStageGraph(stages: readonly StageFrontmatter[]): ContractResult<readonly GraphStage[]>;
function requiredArtifactsForUnit(stage: GraphStage, kind: UnitKind): readonly string[];
```

`parseStageFrontmatter`、`emitStageFrontmatter`、`filterProducesByKind`はC1内部helperで、公開面へ追加しない。parse/emitは`validateStageFrontmatter`の前後でsource表現を扱い、filterは`compileStageGraph`と`requiredArtifactsForUnit`が共有するpure projectionである。kind未指定Unitはpublic signatureを広げず、callerが`requiredArtifactsForUnit`を呼ばずにunfiltered full matrixへ委譲する。

## Contract pipeline

1. 内部`parseStageFrontmatter`が`number`、`name`、`bundle`、`when`、`required_sections`、`produces_kinds`を読み取る。全fieldはoptionalで、未指定時はproperty自体を生成せず既存stage bytesを変えない。
2. `validateStageFrontmatter`がE-USSU01FD3 Aのexact-shapeを検証する。`number`はstringかつ`^\d+\.\d+$`、`name`/`bundle`は非空string、`required_sections`は非空stringの配列、`when`はexactly-one-key object `{ "producer-in-plan": <non-empty artifact slug> }`だけを受理する。block/inline `when`は同じtyped objectへparseするが、値・配列順・表記を追加trim/sort/dedupeしない。
3. 同じvalidationで`produces_kinds`の既知field、artifact slug、重複、`produces`/`optional_produces`との参照整合もfail-closedに検証する。map valueは非空で、全要素が`UNIT_KINDS`に含まれなければならない。
4. 内部`emitStageFrontmatter`はauthored orderと値を保持する。parse→emit→parseでtyped valueを同値にし、追加field未使用stageのbytesを不変にする。
5. `compileStageGraph`が検証済みstage列だけを`GraphStage[]`へ投影する。graph/directive/sensor側にfield parserやkind vocabularyを複製しない。
6. units-generationのYAML edge block parserが各Unitの任意`kind`を`UnitDependencyEdge`へ取り込む。未知値、`name`より前の`kind`、不正型は`malformed`としてcompile前に拒否する。
7. runtime compileが検証済みkindを`bolt_dag.units[].kind`へ保存する。kind未指定Unitはkey自体を持たず、従来shapeを保つ。
8. 内部`filterProducesByKind`がrequiredとoptionalの候補unionを一度filterする。`requiredArtifactsForUnit`はそのうちrequired集合だけを返す。artifactがmap未掲載なら全kindへ適用し、map未指定なら元配列を返す。
9. directive生成とper-unit coverageが同じfilter helper・同じkind snapshotを使う。directiveだけprune、coverageはfull matrixという非対称を許さない。

## Coverageとapprovalの決定木

- stageの未filter required `produces` が0件なら、従来どおり「実行済み」を証明できないためvacuous扱いにしない。
- kind適用後のrequired setが0件なら、そのUnitではstage非該当としてcoveredとする。
- 一つでもrequired artifactが適用されるUnitは、適用後集合の全ファイルが存在するまでuncoveredとする。optional artifactはdirective候補には含むがcoverage要件には含めない。
- 全Unitがkindによりvacuousなper-unit stageは、state toolのartifact guardも同じUnit/kind集合を読み、approvalを許可する。
- runtime graphが欠落・malformed・kindなしの場合はfull matrixへ倒す。over-pruneではなく保守的なunder-pruneを選ぶ。

## Current intentのkind写像

E-USSUFD2は3–0で、U01=`spec`、U09/U11=`packaging`、U02–U08/U10/U12=`library`を採用した。U10は配布物ではなくembedded composition engineであるため`library`。常駐serviceとUIは本intentに存在しない。この写像はunits-generation edge blockのkind fieldへ反映し、再compileでruntime graphへ運ぶ。

## エラーと副作用

schema/parser/filterはpureに保ち、validation失敗時はgraph・state・audit・生成物を変更しない。runtime graphのvalid-but-wrong kindはcompile後のtrust boundaryに属するため、正しさはunits-generation sensorとreviewで固定する。エラー文はfield名、Unit名、実値、許容値を含め、unknown field/kindを黙って無視しない。

## 検証シナリオ

- `number`/`name`/`bundle`/`when`/`required_sections`のabsent、valid、wrong type、空値、malformed number、0/2/unknown predicate、空artifact slugをtable-driven pure testで固定する。
- block/inline `when`のtyped-value同値、authored order/value非canonicalization、追加field未使用stageのbyte-identicalをgolden testで固定する。
- valid/invalid/empty/orphan `produces_kinds`、mixed tagged/untagged Unit、`kind` before `name`をpure testで固定する。
- compile再実行のbyte-identical、kindless graphのshape不変、required/optional対称pruningをintegration testで固定する。
- packaging Unitでfunctional-design required集合0のvacuous approvalと、service Unitのartifact 0件が拒否されるnegative controlを対で実証する。
- UI Unitではoptional `frontend-components`をdirectiveへ含めつつcoverage exempt、kind mapを持たないcode-generationはfull matrixを維持する。

## Review — Iteration 1

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T14:54:08Z`
- Verdict: **NOT-READY**

### Findings

1. **MAJOR — C1の正準公開seamが成果物から一意に復元できない。** `component-methods.md` は `validateStageFrontmatter(raw, context)`、`normalizeUnitKind(raw)`、`compileStageGraph(stages)`、`requiredArtifactsForUnit(stage, kind)` の4関数と各signatureを公開契約としている。一方、本成果物は `parseStageFrontmatter`、`emitStageFrontmatter`、`filterProducesByKind` を処理主体として記述し、正準4関数の完全なsignatureも、追加3関数が内部helperであるかどうかも示していない。特にdirective候補とrequired coverageの導出責務が `requiredArtifactsForUnit` と `filterProducesByKind` の間で曖昧で、このままでは公開面の追加・置換を伴う実装が成立し得る。正準4signatureをそのまま公開seamとして明記し、parse/emit/filterを使うなら内部helperとして責務を閉じ、kind未指定経路を正準signatureを変えずに処理する境界を示すこと。
2. **MAJOR — U01が所有する追加frontmatter fieldの型・正規化・失敗条件が未設計。** `requirements.md` FR-6 item 18、`components.md` C1、`unit-of-work.md` U01は `number`、`name`、`bundle`、`when`、`required_sections` もtyped validation/normalizationの対象としているが、3成果物は主に `produces_kinds` とUnit kindだけを具体化し、これら5 fieldについて受理する型、欠落時shape、canonical normalization/round-trip、invalid条件を定義していない。`when` も「保存し評価しない」以上の入力契約がなく、実装とnegative testを一意に作れない。既決のstage modelから各fieldの契約を機械的に展開し、`validateStageFrontmatter`、graph投影、parse/emitの各境界と対照testへ反映すること。

### Checks

- 必須成果物3件と質問正本は存在し、UIなしのため `frontend-components.md` 不在は妥当。
- Q1/Q2の裁定、UnitKindのlib単一所有、現intentのkind写像は3成果物へ整合して反映済み。
- `required-sections` と `upstream-coverage` の文書形状は満たす。上記MAJOR解消後、正準signature・全fieldのinvalid fixture・既定bytes不変を `answer-evidence` 観点で再確認する必要がある。

## Review — Iteration 2

- Reviewer: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:06:03Z`
- Verdict: **READY**

### Findings

- **CRITICAL: 0 / MAJOR: 0 / MINOR: 0**。新規findingなし。

### Iteration 1 findingsの再評価

1. **RESOLVED — 正準4 signatureと内部helper境界。** `validateStageFrontmatter(raw, context)`、`normalizeUnitKind(raw)`、`compileStageGraph(stages)`、`requiredArtifactsForUnit(stage, kind)`が`component-methods.md`と完全一致する唯一のpublic seamとして3成果物に明示された。`parseStageFrontmatter`、`emitStageFrontmatter`、`filterProducesByKind`はC1内部helperへ閉じられ、kind未指定時もpublic signatureを変更せずcallerがfull matrixへ委譲するため、公開面と責務境界を一意に実装できる。
2. **RESOLVED — 追加5 fieldのexact-shape・正規化・invalid境界。** E-USSU01FD3=Aの裁定どおり、`number`、`name`、`bundle`、`when`、`required_sections`のoptional shape、欠落property非生成、block/inline `when`のtyped同値、追加trim/sort/dedupeなし、invalid時のmutation前拒否、既存core stage bytes不変が3成果物へ整合反映された。absent/valid/wrong-type/empty/malformed、`when`の0/2/unknown key、配列順序保持、parse→emit→parse同値、byte-identicalのpositive/negative fixtureも実装可能な粒度で指定されている。

### Election fidelityと実装可能性

- `functional-design-questions.md`、3成果物、E-USSU01FD3 recordの間で、upstream `e89162f` exact-shape、追加canonicalizationなし、absent bytes不変が一致する。
- schema validation、内部parse/emit、graph projection、directive/coverage共有filter、approval guardまでの処理順と失敗時不変条件が閉じており、第二語彙・第二parser・未承認public APIを追加せず実装できる。

### Sensors

- `required-sections`: **PASS** — 必須3成果物はいずれも複数のH2節を持つ。
- `upstream-coverage`: **PASS** — `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の6入力を質問正本と3成果物が明示し、U01契約へ追跡している。
- `answer-evidence`: **PASS** — Q1/Q2の既決裁定とQ3のE-USSU01FD3=Aが、公開seam、field shape、failure境界、fixtureへ反映されている。

## 実装裁定追補(2026-07-22)

code-generation レビューイテレーション1(Critical #1/#2)と、それを受けたユーザー裁定(2026-07-22、「実装を正とし記録を訂正」)による申告付き追補。本節が本成果物・business-rules.md・domain-entities.md の該当記述(正準4 signature のうち `compileStageGraph`、および内部 helper `filterProducesByKind`)に優先する。

- **`compileStageGraph` の signature**: 実装は本文の純関数 signature(`(stages: readonly StageFrontmatter[]) => ContractResult<readonly GraphStage[]>`)ではなく、既存の disk 読み込み型コンパイラ `compileStageGraph(): { json: string; gridJson: string; stages: GraphStage[] }`(`packages/framework/core/tools/amadeus-graph.ts:1439`、検証失敗は throw)を再利用する。根拠: NFR-7(既存 choke point への最小変更)、既存テスト群(t88/t89/t110/t124/t184/t212/t66)が現行 signature を前提とすること。fail-closed 検証は `validateStageFrontmatter` 側で成立しており、契約の実質(未知 field/kind の compile 前拒否)は不変。
- **`filterProducesByKind`**: 独立 helper としては切り出されていない(repo 全域 grep 0 件)。filter ロジックは `requiredArtifactsForUnit`(`amadeus-graph.ts:764`)本体にインライン実装され、`compileStageGraph` は kind フィルタリングに関与しない。directive/coverage(orchestrate)と artifact guard(state の `kindAwareArtifactsExist` :972)は同一の `requiredArtifactsForUnit` を消費することで「同一選択規則」の不変条件を満たす。
