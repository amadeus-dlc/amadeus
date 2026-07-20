# Unit of Work — 形式検証対照実験

## 上流入力と分解方針

`components.md` の所有境界、`component-methods.md` のpublic interface、`services.md` のlocal CLI lifecycle、`component-dependency.md` のfail-closed topology、`decisions.md` のADR-1〜6、`requirements.md` のFR / NFRを入力とする。E-FVEUG1=Aに従い、deployment targetではなく変更理由と独立test境界に沿う8 capability-aligned unitsへ分解する。

全unitはrepo-local modular monolithへembeddedされ、独立deploy targetを持たない。intent固有evidenceだけをrecordへ置く。推定LOCはsource + test + configのadditionsを含むレンジであり、生成物、raw evidence、TLC jarを含めない。

## Unit一覧

| Unit slug | Capability / delivers | Boundary / does not own | Deploy | Complexity | Estimated LOC |
| --- | --- | --- | --- | --- | --- |
| `experiment-contract-provenance` | 共通config / result schema、public input hash、authoring event ledger、blind state validator、command / handler ports、dependency-injected generic dispatcher | concrete providerをimportせず、test doubleで独立検証する | embedded | M | 260–380 |
| `sealed-fixture-registry` | defect台帳、1 defect / branch、red-green falling proof、禁止データscan、seal / reveal / promotion validationとmanifest生成 | arm code、promotion時機、採否を持たない | embedded + record evidence | M | 250–380 |
| `execution-evidence` | cell / suite execution port、append-only evidence、schema / matrix completeness、content addressing | arm固有oracleとParetoを持たない | embedded + record evidence | M | 260–400 |
| `tla-arm-toolchain` | TLC v1.7.4 acquisition / checksum、有限TLA+ model、TLC adapter、complete exploration normalization | fixture identity、TS oracle、採否を知らない | embedded | L | 300–480 |
| `tla-invalid-timestamp-skeleton` | 専用integration harnessでfrozen Arm T × sealed #1252を結線し、CI / raw evidence / stop gateを実証 | final CLI root、Arm S開始、残fixture fan-out、manifest公開を行わない | embedded integration slice | S | 120–220 |
| `ts-arm` | enumerable universe、直積全域性、fast-check、submittedAt / receivedAt brand、TS adapter | TLA実装、skeleton evidence、fixture期待値を知らない | embedded | L | 280–450 |
| `full-matrix-suite` | promoted manifestをconsumeし、canonical baseline + D-COUNT suite、1 warmup + 5 measured、matrix / cost raw dataを生成 | manifest生成 / promotion判断、eligibility / winner決定、report表現を持たない | embedded + record evidence | M | 180–300 |
| `eligibility-report` | hard eligibility、3軸Pareto、Alloy trigger、reproducible report / trace verification、全handlerを結線する独立wiring-only final CLI root | wiring moduleは評価 / 表示を重複実装せず、raw evidenceを書換えない | embedded + record report | M | 300–460 |

合計見積りは1,950–3,070 LOC。unitごとの上限超過は、責務追加ではなく分解漏れまたは既存reuse不足の兆候としてConstruction gateで停止・再評価する。

## Unit責務と完成境界

### experiment-contract-provenance

- `ExperimentConfig`、`TlcProfile`、`CellResult`、`ArmSuiteResult`のparser / canonical hash。
- `ARM_AUTHORING_STARTED` / `ARM_FROZEN`とstate transition validation。
- `fixture-seal / start / freeze / reveal / fetch-tlc / run / benchmark / evaluate / report`のtyped command / handler portsと、handler mapをconstructor injectionするgeneric dispatcher。concrete provider moduleをimportしない。
- state validatorが両freezeと`SKELETON_PASSED`後のpromotion許可を返す。実際のpromotion invokeはfinal rootがRegistry handlerへrouteする。
- 完成条件: test doubleだけでrouting、dependency error propagation、invalid event order、dirty freeze、private input漏洩、禁止subcommand transitionが検証できる。
- U1を単独Boltとして着地させない。Delivery Planningは最初のconcrete handler群とwalking-skeletonを同一Boltへ束ねる。

### sealed-fixture-registry

- 7 predicateを独立red / green proofで成立させ、不能時は5 clusterへ縮約し6を作らない。
- patch、baseline SHA、injection SHA、許可hunk、sealed disclosureを所有。
- fixtureを走査し、secret、個人データ、外部選挙store参照が0件であることをmachine-readable receiptへ記録する。
- promotion preconditionのvalidationとrepo-local manifest生成を所有するが、invoke時機はCoordinatorから受ける。
- 完成条件: wrong branch、複数cluster波及、freeze前reveal、D-COUNT不一致、禁止データ / 外部store参照、未承認promotionを拒否。

### execution-evidence

- arm-neutral subprocess port、raw stdout / stderr / timing / exit保存。
- duplicate / missing / handwritten cellを拒否するmatrix completeness。
- 完成条件: schema欠損・overwrite・identity mismatch・suite input hash driftを拒否。

### tla-arm-toolchain

- fixed URL / SHA-256のoffline-verifiable acquisition。
- voter / choice / timestamp有限domainとcomplete exploration proof。
- 完成条件: completion marker / state統計なしの`NOT_DETECTED`、timeout、checksum不一致を`HARNESS_ERROR`。

### tla-invalid-timestamp-skeleton

- U1 ports、Registry / Evidence / TLA handlersを専用integration harnessで結線し、final U8 rootに依存せず`T_FROZEN → #1252_REVEALED → SKELETON_PASSED|FAILED`だけを統合。
- 完成条件: deterministic verdict、freeze / injection SHA、CI run、raw measurementの相互参照。failure時は後続transition 0件。

### ts-arm

- public contractだけからuniverse / invariant / brand boundaryをfreeze。
- 完成条件: fixed seedのreplay、全域性、時刻概念混同のnegative test。skeleton / Arm T pathがinput allowlistに0件。

### full-matrix-suite

- Coordinator / Registryが昇格したmanifestのhashを検証してconsumeし、正準input setとserial full suitesを実行する。
- `experiment-contract-provenance`のauthoring ledgerからelapsed、frozen arm diffから`ARM_AUTHORED_LOC`を読み、suite timingsとともにraw costを保存する。
- 完成条件: 1 warmup + 5 measured suites、各120秒、全run verdict一致、全raw sample保存。

### eligibility-report

- 全件DETECTED / HARNESS_ERRORなし / false positive 0のhard gate。
- LOC / authoring elapsed / suite medianのPareto、trade-off時no winner、Alloy判定。
- `wiring-only` moduleがU1 dispatcherへU2〜U8のconcrete handlersを全てdirect import / injectする。wiring moduleはeligibility / Pareto / report評価・表示を実装せず、同unit内の別moduleが所有するhandlerを登録するだけとする。
- U1〜U7が完成する前にU8完成を主張しない。完成条件: wiring testが全commandのhandler一意性とerror propagationを検証し、同じevidenceから同じclosed decisionを再計算し、全rowからcommand / CI / artifactへ到達。

## Reuse inventory

| Existing asset | Reused by | New mechanismが必要な理由 |
| --- | --- | --- |
| `scripts/amadeus-election-model.ts` pure domain / Result pattern | contract、TLA / TS arm | 既存modelは検出arm / evidence schemaを持たないためadapterは新規 |
| `scripts/amadeus-election-store.ts` filesystem / receivedAt境界 | fixture、TS / TLA contract | production storeをfixture registryへ流用せず、公開契約の事実だけ再利用 |
| `scripts/amadeus-election-record.ts` verify / timeline evidence pattern | evidence、report | 実験matrix / cost / arm provenanceは新規schemaが必要 |
| `tests/unit` / `tests/integration` / `tests/e2e` | 全unit | 既存runnerとtest tierをそのまま使い、新CI workflowは作らない |
| fast-check 4.9.0と既存PBT conventions | ts-arm | 依存追加なし。選挙predicateのarbitrary / invariantだけ新規 |
| Node/Bun fs・crypto・subprocess | contract、fixture、evidence | 新package / serviceを避ける |
| Java 26.0.1 | tla-arm-toolchain | TLC jarだけfixed acquisitionが必要 |

`packages/framework/`、`dist/`、self-install、AWS、database、UI、production required checkは全unitで変更しない。
