# Unit of Work — CG 観測可能区間と帰属不能残余

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。user-storiesはscopeで未生成である。

## Decomposition decision

既存Stage Statistics CLIという単一delivery surfaceを維持しながら、Application Designで確定した変更理由とpure test seamを4 Unitへ写像する。Unitはpackageやprocessを増やす境界ではなく、Constructionで設計・実装・検証を完結できるownership境界である。

| ID | Unit name | Canonical kind | Component ownership | Deployment | Complexity |
|---|---|---|---|---|---|
| U-01 | `attribution-domain-contracts` | `library` | C-02、C-06 domain/precedence tests | existing CLIへembedded | S |
| U-02 | `candidate-evidence-inventory` | `library` | C-03、C-06 candidate/Event Set tests | existing CLIへembedded | L |
| U-03 | `population-interval-accounting` | `library` | C-04、C-06 interval/accounting tests | existing CLIへembedded | L |
| U-04 | `stage-stats-attribution-service` | `service` | C-01、C-05、C-06 report/façade/CLI/integration/parity tests | existing one-shot CLIをshared delivery | XL |

canonical kindはStage 2.7のclosed meaningsに従う。U-01〜U-03はstandalone runtimeを持たない再利用可能code、U-04はoperator/CIが直接起動する既存deployed executableである。

## U-01 attribution-domain-contracts

### Purpose and boundaries

attribution pipelineで無効状態を表現不能にする共通type contractを所有する。`TargetStage`、`OutlierLimit`、interval/window/candidate identity、family/category/rejection vocabulary、`AttributionResult`、population accounting valueを含む。

### Responsibilities and deliverables

- `amadeus-stage-attribution-domain.ts`のbrand、readonly union、smart constructor。
- FR-EVT-5のprimary rejection precedenceとpost-accounting disposition vocabulary。
- population/window subjectを区別するtyped `accounting-invariant`。
- `tests/unit/t486-stage-attribution-domain.test.ts`のtable-driven constructor/precedence unit tests。

### Exclusions and constraints

filesystem、process、journal decode、interval algorithm、rendererを所有しない。exception class、新規runtime dependency、nullable primitiveの無検証流通を導入しない。

### Completion evidence

全closed tupleのexhaustiveness、invalid stage/outlier/intervalのtyped failure、reason precedenceの複合欠陥fixture、公開typeの循環importなしを証明する。

## U-02 candidate-evidence-inventory

### Purpose and boundaries

audit rowをcanonical dedupしたattribution-only viewから、全candidate familyのinventory、Event Set展開、明示intent/stage/identity、lifecycle pairingを構成する。

### Responsibilities and deliverables

- `amadeus-stage-attribution-candidates.ts`のcorpus view、outer envelope decoder、family classifier、lifecycle grouper。
- C-03の`CandidateInventory`とsecondary diagnostics。
- execution/unit-pool/transaction Event Setのschema/digest/id検証。
- `tests/unit/t486-stage-attribution-candidates.test.ts`のsynthetic lifecycle、malformed payload、digest mismatch、duplicate identity unit/PBT。

### Exclusions and constraints

measured record列をdedupしない。window containmentやtimestamp近接からintent/stage/identityを推定しない。interval clip、idle差引、renderer、runtime graph projectionを所有しない。

### Completion evidence

全familyを黙って捨てずaccepted/rejectedへ分類し、各candidate groupを1 primary reasonへ計上する。canonical duplicateとduplicate lifecycleを分離する。

## U-03 population-interval-accounting

### Purpose and boundaries

全eligible windowとaccepted candidateを単一population呼出しで処理し、半開区間、clip、idle差引、category/global union、candidate disposition、残余恒等式を保証する。

### Responsibilities and deliverables

- `amadeus-stage-attribution-intervals.ts`のinterval primitivesと`accountAttributionPopulation`。
- candidateのtyped intentとwindow intentが一致するwindowだけをclip対象にし、異なるintentの重複windowへcontributionを作らない。
- candidateごとに1 disposition、`accounted`の場合だけ1件以上のwindow contribution。
- eligible window 0/1/複数、candidateの0/1/複数window交差、全idleのfixture。
- `tests/unit/t486-stage-attribution-intervals.test.ts`でfast-checkによるunion・差引・会計恒等式のPBT。

### Exclusions and constraints

event field、lifecycle reason、statistics、outlier、format rendererを所有しない。window containmentをintent/stage証拠へ昇格させない。

### Completion evidence

candidate数=disposition数、eligible window数=window accounting数、`observable + unattributable = net`、finite ratio、入力順非依存を証明する。

## U-04 stage-stats-attribution-service

### Purpose and boundaries

既存`amadeus-stage-stats.ts`を互換façade/one-shot serviceとして維持し、window selection、U-02/U-03 orchestration、semantic report、3 renderer、CLI/pipeを統合する。

### Responsibilities and deliverables

- C-01の`--stage`/`--outliers`、legacy measured branch、typed error→exit 1/2、stdout drain。
- `amadeus-stage-attribution-report.ts`のeligibility、statistics、outlier、methodology、candidate reason合流。
- Markdown/CSV/JSONを1つのsemantic modelからappend-onlyで生成。
- existing `tests/unit/t486-stage-stats.test.ts`のreport/façade compatibilityと`tests/integration/t487-stage-stats.integration.test.ts`のCLI/real-corpus/oversized pipe integration。
- Issue #2695完了条件1〜10とIssue #2700残余criterionの全format証明。

### Exclusions and constraints

既存measured population/fieldを変更しない。C-05はC-04を再呼出しせず、rendererは母集団選択・union・ratioを再計算しない。project fileへ書き込まない。

### Completion evidence

既存focused test非退行、3format semantic parity、各format 65,536 bytes超のfull-capture/digest parity、invalid argv exit 2、partial corpus/invariant exit 1、empty population exit 0を証明する。

## Shared Definition of Done

- `requirements.md`のFR-POP-1〜FR-TEST-3、NFR-1〜7、完了条件1〜10をstory mapで全数coverする。
- `component-methods.md`のpublic seamと`component-dependency.md`の禁止edgeを維持する。
- `services.md`のread-only one-shot lifecycleと`decisions.md`のADR-1〜3を守る。
- source-only boundaryを守り、generated `dist/`やself-install surfaceをcommitしない。
- 実装はBun/TypeScript、class-free functional modeling、既存dependencyだけで完結する。

## C-06 test ownership and file isolation

Application DesignのC-06はtest capability全体を表すが、Unit ownershipでは次の互いに異なるfileへ分配する。U-04がC-06全体またはprovider Unitのpure testを所有することはない。

| Unit | Owned test file(s) | Evidence boundary |
|---|---|---|
| U-01 | `tests/unit/t486-stage-attribution-domain.test.ts` | constructors、closed vocabulary、precedence |
| U-02 | `tests/unit/t486-stage-attribution-candidates.test.ts` | dedup、Event Set、family、lifecycle、rejection |
| U-03 | `tests/unit/t486-stage-attribution-intervals.test.ts` | interval algebra、population disposition、accounting PBT |
| U-04 | existing `tests/unit/t486-stage-stats.test.ts`、`tests/integration/t487-stage-stats.integration.test.ts` | report population、façade compatibility、CLI、3format、real corpus、oversized pipe |

各provider Unitは自Unitのsourceとtestだけでcompletion evidenceを作れる。U-04はprovider test fileを編集せず、public seamをconsumerとして統合検証する。

## Scope and sizing verification

4 UnitはIssue scopeを分配するが削減しない。U-01が語彙、U-02が全event evidence、U-03が全interval会計、U-04がpopulation/report/CLI/compatibility/testを所有し、owner不在のFRはない。推定総量はApplication Designのsource約1,680〜2,380行とtest約1,500〜2,200行であり、Unit別complexityは実装quotaではなくreview/cognitive-load指標である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-09T15:17:55Z
- **Iteration:** 1
- **Scope decision:** none

4 Unitのkind、runtime DAG、population-wide accounting、typed error経路、全FR/NFR coverageは概ね整合するが、C-06のtest ownershipがUnit間で競合し、独立に実装可能な境界になっていない。

### Findings

- BLOCKER | unit-of-work.mdのownership表はC-06全体をU-04へ割り当てる一方、U-01はconstructor/precedence unit tests、U-02はsynthetic lifecycle・Event Set・duplicate identityのunit/PBT、U-03はinterval/accounting PBTを各Unit自身のResponsibilities、Deliverables、Completion evidenceとして要求している。上流components.mdではこれらpure/PBTとintegrationをC-06のt486-stage-stats.test.ts / t487-stage-stats.integration.test.tsが所有し、story mapもFR-TEST-1のPrimary UnitをU-04としている。このままではU-01〜U-03の完了にU-04所有fileの変更が必要になる一方、DAGではU-04がU-01〜U-03へ依存するため、provider Unitの独立完了条件とfile/component ownershipが逆転・重複する。downstream Boltが同じC-06 fileを競合編集しないよう、pure test ownershipをU-01〜U-03へ明示分配してU-04にはfaçade/report/CLI/integration/parityだけを残すか、U-01〜U-03のDoDをU-04所有testに依存しない契約証拠へ変更し、unit-of-work.md、DAG integration contracts、story mapのFR-TEST-1/NFR-6を同じ境界へ揃える必要がある。
- FOLLOW-UP | FR-EVT-3のstory mapはU-02をPrimary、U-01/U-04をSupportingとしているが、accepted flat intervalを同じ明示intentのwindowだけにclipする最終enforcement ownerは上流設計上C-04、すなわちU-03である。U-03のPurposeも全eligible windowとだけ記載されており、異なるintentの重複windowを除外する契約がUnit artifact単独では明示的でない。scope欠落を防ぐため、FR-EVT-3のSupporting UnitへU-03を加え、U-03責務にtyped intent一致によるwindow filteringを明記するのが望ましい。
- NIT | unit-of-work-dependency.mdのmachine-readable DAGとProse DAGは同じconsumer→provider edgeでcycle-freeだが、cycle検査用layerだけが{U-01} → {U-02,U-03} → {U-04}と逆向きの矢印を使う。推奨build orderではない旨は明記されているものの、edge記法の読み違いを避けるためdependency depth等の無向き表記へするとよい。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-09T15:22:20Z
- **Iteration:** 2
- **Scope decision:** none

C-06のtest ownership競合はUnit別の非交差test file、consumer→provider契約、FR-TEST-1/NFR-6の整合によって解消され、4 Unitのkind、cycle-free DAG、全FR/NFR coverage、実装可能性、Issue scope維持を確認した。

### Findings

- None
