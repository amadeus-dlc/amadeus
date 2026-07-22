# Business Rules — stage-contract

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Contract invariants

正準public seamは次の4 signatureだけである。

```ts
function validateStageFrontmatter(raw: unknown, context: ValidationContext): ContractResult<StageFrontmatter>;
function normalizeUnitKind(raw: unknown): ContractResult<UnitKind>;
function compileStageGraph(stages: readonly StageFrontmatter[]): ContractResult<readonly GraphStage[]>;
function requiredArtifactsForUnit(stage: GraphStage, kind: UnitKind): readonly string[];
```

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U01-01 | UnitKindは`service | spec | ui | packaging | library`のclosed vocabularyであり、`amadeus-lib.ts`の単一定義だけを参照する。 | unknown kindとしてmutation前に拒否 |
| BR-U01-02 | `produces_kinds`のkeyは同stageの`produces`または`optional_produces`に実在するkebab-case artifact名でなければならない。 | orphan/invalid keyをschema error |
| BR-U01-03 | `produces_kinds.<artifact>`は1件以上のUnitKindを持つinline listでなければならない。 | empty/non-list/unknown valueをschema error |
| BR-U01-04 | map未掲載artifactは全kindへ適用する。mapまたはUnit kind自体が未指定ならfull matrixを保つ。 | 暗黙prune禁止 |
| BR-U01-05 | kind filterは`produces + optional_produces`の候補unionへ適用し、required coverageにはfilter後の`produces`だけを使う。 | directive/coverageの非対称をtest failure |
| BR-U01-06 | filter後required集合0は当該Unitでvacuously covered。ただしstageの元required集合0は実行証拠なしとして別扱い。 | blanket bypass禁止 |
| BR-U01-07 | units-generationでkindをenum検証し、compile後runtime graphは検証済みsnapshotとして読む。 | malformed edge blockはcompile/gate失敗 |
| BR-U01-08 | `when`は型付きで保存・round-tripするが、このintentでは評価しない。 | evaluator追加はscope逸脱 |
| BR-U01-09 | plugin非active、kind未指定、kind map未指定の既定経路は現行出力とbyte-identical。 | NFR-3違反として差戻し |
| BR-U01-10 | validation/compile/approval失敗はstage source、graph、state、auditを部分更新しない。 | loud failure、既存bytes不変 |
| BR-U01-11 | public seamは`validateStageFrontmatter`、`normalizeUnitKind`、`compileStageGraph`、`requiredArtifactsForUnit`の正準signatureだけ。parse/emit/filterは内部helper。 | 未承認public APIを拒否 |
| BR-U01-12 | `number`はoptionalなstringで`^\d+\.\d+$`、`name`/`bundle`はoptionalな非空string。 | wrong type/空値/malformed numberをinvalid |
| BR-U01-13 | `when`はoptionalなexactly-one-key objectで、keyは`producer-in-plan`、valueは非空artifact slugだけ。保存するが評価しない。 | 0/複数/unknown key・空値をinvalid |
| BR-U01-14 | `required_sections`はoptionalな非空string配列。値とauthored orderを追加trim/dedupe/sortしない。 | wrong type/空要素をinvalid |
| BR-U01-15 | 追加field欠落時はproperty自体を生成せず、既存core stageのparse/compile/emit bytesを変えない。 | NFR-3 regression |

## Unit classification rules

E-USSUFD2（3–0、GoA favor 3、留保なし）の写像を正本とする。

- U01 `stage-contract`は、その場でconsumerに解釈されるcontract/schemaを所有するため`spec`。
- U09 `plugin-projection`とU11 `reference-plugin-and-guides`はbuild/distribution artifactを所有するため`packaging`。
- U02–U08、U10、U12はstandalone runtimeを持たないembedded reusable codeなので`library`。
- U10はpluginを包装する成果物ではなく、inspect/plan/merge/compile/doctor/atomic apply/dropを実行するcomposition engineである。よって`packaging`へ分類しない。
- `service`と`ui`は本intentでは0件。将来Unitに使えるが、現在のUnitへ便宜的に割り当てない。

## Construction design artifact applicability

upstream `831bd29c392eff141a230e1e0501239eae132c31` の4 stage frontmatterをAmadeus名へADAPTする正確な適用表。`全kind`はmapへkeyを**書かない**ことで表現し、`service | spec | ui | packaging | library`の全てへ適用する。required/optionalはcoverage要件、kind listは適用性という直交軸である。

| Stage | Artifact | Coverage | 適用UnitKind |
|---|---|---|---|
| Functional Design | `business-logic-model` | required | `service`, `ui`, `library` |
| Functional Design | `business-rules` | required | `service`, `spec`, `library` |
| Functional Design | `domain-entities` | required | `service`, `spec`, `library` |
| Functional Design | `frontend-components` | optional | `ui` |
| NFR Requirements | `performance-requirements` | required | `service`, `ui` |
| NFR Requirements | `security-requirements` | required | 全kind（`produces_kinds`未掲載） |
| NFR Requirements | `scalability-requirements` | required | `service` |
| NFR Requirements | `reliability-requirements` | required | `service` |
| NFR Requirements | `tech-stack-decisions` | required | 全kind（`produces_kinds`未掲載） |
| NFR Design | `performance-design` | required | `service`, `ui` |
| NFR Design | `security-design` | required | 全kind（`produces_kinds`未掲載） |
| NFR Design | `scalability-design` | required | `service` |
| NFR Design | `reliability-design` | required | `service` |
| NFR Design | `logical-components` | required | `service`, `ui`, `library` |
| Infrastructure Design | `deployment-architecture` | required | `service`, `ui`, `packaging` |
| Infrastructure Design | `infrastructure-services` | required | `service`, `packaging` |
| Infrastructure Design | `monitoring-design` | required | `service`, `packaging` |
| Infrastructure Design | `cicd-pipeline` | required | `service`, `ui`, `packaging`, `library` |
| Infrastructure Design | `shared-infrastructure` | optional | 全kind（`produces_kinds`未掲載） |

表から導出されるvacuous例も固定する。Functional Designの`packaging` Unitはrequired/optionalとも0件、Functional Designの`spec` Unitは`business-rules`と`domain-entities`、NFR Designの`packaging` Unitは未掲載の`security-design`だけを要求する。Infrastructure Designの`spec` Unitはrequired集合0だが、optional `shared-infrastructure`はcoverageを要求しない。この集合とdirective候補の差を同じfilter関数から導出する。

## Decision provenance

E-USSUFD1はB=`amadeus-lib.ts`所有を2–1で採用し、GoAは全員1、留保なし。少数Aは`StageFrontmatter`等のclosed vocabularyと同じstage-schemaへの凝集を主張した。多数は、frontmatter parse/emitがlib所有でありstage-schemaが既にlibへ依存すること、Aが循環または再exportを招くこと、upstream同型が最小差分であることを優先した。記録は`amadeus/spaces/default/elections/E-USSUFD1/record.md`。

E-USSUFD2はAを3–0で採用し、GoAは全員1、留保なし。U10を`packaging`とするB、全`library`のC、untaggedのDはいずれも非採用。記録は`amadeus/spaces/default/elections/E-USSUFD2/record.md`。

E-USSU01FD3はAを3–0で採用し、GoA favor 3、留保なし。upstream `e89162f` exact-shape、追加canonicalizationなし、追加field absent時のproperty/bytes不変を正本とする。記録は`leader/amadeus/spaces/default/elections/E-USSU01FD3/record.md`。

## Verification rules

- parser/schema testはvalidだけでなくunknown kind、orphan key、empty list、kind-before-nameを落ちる実証として含める。
- 追加5 fieldはabsent/valid/wrong type/empty/malformed、`when` block/inline・0/2/unknown key、`required_sections` order保持を対照fixture化する。
- pruning testはvacuous positiveとnon-vacuous negative controlを同じartifact guard設定で実行する。
- mixed DAGでtagged Unitだけpruneし、untagged Unitはfull matrixを要求する。
- compileを2回実行しruntime graph bytesが同一であることをassertする。
- sourceと6 harness dist、4 self-install対象の差を既存generator/checkで検証し、`dist/`は手編集しない。

## 実装裁定追補(2026-07-22)

BR-U01-11 の正準 signature のうち `compileStageGraph` は申告済み逸脱として既存 disk 読み込み型 signature を維持し、`filterProducesByKind` は独立 helper として存在しない(インライン実装)。正準文は business-logic-model.md「実装裁定追補(2026-07-22)」を参照。
