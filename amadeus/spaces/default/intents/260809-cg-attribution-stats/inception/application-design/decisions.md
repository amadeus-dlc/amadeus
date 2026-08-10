# Architecture Decisions — CG 観測可能区間と帰属不能残余

## Decision index

本書は `requirements.md`、Brownfieldの `architecture.md` と `component-inventory.md`、team-practices、`components.md` / `component-methods.md` / `services.md` / `component-dependency.md`を入力とする。user storiesは未生成である。

| ADR | Decision | Status | Reversibility |
|---|---|---|---|
| ADR-001 | 既存CLI façade + pure attribution modules | Accepted | 中 |
| ADR-002 | measured/attribution corpusを分岐しdedupを隔離 | Accepted | 低〜中 |
| ADR-003 | 1つのcanonical semantic reportとfail-closed typed pipeline | Accepted | 中 |

## ADR-001: 既存CLI façadeを残してpure attribution modulesを抽出する

### Status

Accepted — Application Design Q1で選択肢AをAUTO_DECIDED（`auto-decision-6e64324e8746f7ec14cd83cd8fc5f586`）。

### Context

`amadeus-stage-stats.ts`は既存のscan、window、idle、sensor/model/review集計、3renderer、CLI shellを約1,000行で所有する。Issue #2695はcandidate inventory、Event Set decode、lifecycle rejection、interval algebra、statistics、outliersを追加するため、同一fileへの単純追加は変更理由とcomplexityを集中させる。一方、別process/serviceへ分ける要求や独立scale要件はなく、新しいruntime dependencyも禁止されている。

主要品質属性はNFR-1 accounting correctness、NFR-2 determinism、NFR-3 fail-closed、NFR-6 maintainability/testability、FR-COMP-1 compatibilityである。

### Options

- **Option A — façade + pure modules**: 既存entry/public seamをC-01へ残し、domain/candidates/intervals/reportをC-02〜C-05へ分離する。利点は変更理由の分離、unit/PBT seam、既存consumer維持。欠点はimport edgeとtype数が増える。逆戻しは中程度。
- **Option B — single file extension**: 既存file内に全機能を追加する。利点はfile数が少ない。欠点は1,000行級moduleの責務集中、complexity上昇、candidate/interval/rendererの相互到達。戻しやすいが長期変更コストが高い。
- **Option C — separate CLI**: attribution専用CLIとreportを新設する。利点は物理分離。欠点は3format parityと母集団を2契約に分裂させ、Issueが要求する既存reportのappend-only拡張に反する。逆戻しは中程度。
- **Option D — plugin/network service**: 独立serviceへ処理を委譲する。利点は独立scale。欠点はnetwork/operations/cost/failure modeを新設し、one-shot read-only CLI要件に対して過剰。逆戻しは困難。

### Decision

Option Aを採用する。`amadeus-stage-stats.ts`はI/O、既存measured pipeline、orchestration、renderer、CLIを所有する互換façadeとし、次のpure moduleを追加する。

- `amadeus-stage-attribution-domain.ts`
- `amadeus-stage-attribution-candidates.ts`
- `amadeus-stage-attribution-intervals.ts`
- `amadeus-stage-attribution-report.ts`

既存exportを内部moduleへ移してconsumerに追従を要求せず、façadeから既存関数を提供し続ける。新規moduleをfaçadeから全面re-exportしない。

### Consequences

#### Positive

- candidate rule、interval algebra、population/statisticsを独立にTDD/PBTできる。
- rendererが集計知識を持たず、3format driftを抑止できる。
- module dependencyがacyclicになり、変更blast radiusを限定できる。
- 既存CLI/test importを維持できる。

#### Negative

- source fileが4件増え、domain typeの命名とimport管理が必要になる。
- 既存`amadeus-stage-stats.ts`からpure logicを一度に大規模移動すると回帰riskがあるため、小さいsliceで配線する必要がある。
- façadeがorchestrationを所有し続けるため、完全なdeep module化ではない。

#### Security and compliance impact

trust boundary parseとrenderer escapingをC-01/C-03に明示しやすくなる。新しいnetwork、credential、storage、PII sourceはない。audit read-onlyと生成物非編集のproject policyを維持する。

### Alternatives Rejected

Option BはNFR-6とInceptionのpackage-design規則に対し、追加規模2,000行超相当の変更理由を1fileへ集中させるため却下する。Option CはFR-OUT-4/FR-COMP-1の単一semantic reportに反する。Option Dは要求にない運用・cost・security境界を導入する。

### Reversibility

中。pure moduleをfaçadeへ戻すことは可能だが、public seamをmodule側へ漏らすと困難になる。C-01だけをpublic entryとして保つことで可逆性を確保する。

## ADR-002: measured corpusとattribution corpusを明示分岐する

### Status

Accepted — Requirements Analysis iteration 2 READYでFR-POP-1/3の境界が確定済み。

### Context

現行`scanCorpus`はshardごとのnormalized rowをそのまま`buildWindows`等へ渡し、cross-shard canonical dedupを行わない。一方、attribution candidateはcanonical wire duplicateを除去しないと同じlifecycleを二重計数する。dedup済み列を既存window構築へ渡すと、現行measured populationと既存report値を変え得る。

### Options

- **Option A — explicit two-branch view**: original record sequenceをlegacy measuredへ渡し、別readonly attribution viewだけをcanonical dedupする。互換性が高く、追加memory O(n)。逆戻しは中。
- **Option B — dedup before every consumer**: 全consumerへdedup済み列を渡す。pipelineは単純だが既存measured値を変更する。逆戻しは困難。
- **Option C — no dedup**: 全分岐で現行列を使う。measured互換は保つがcandidate重複とlifecycle duplicateを区別できない。逆戻しは容易。
- **Option D — mutate scanned corpus in place and reconstruct legacy rows**: dedup後にlegacyだけ重複を戻す。状態と順序が複雑になり、正しさの証明が難しい。逆戻しは困難。

### Decision

Option Aを採用する。C-01が読み取ったoriginal readonly recordsを既存measured pipelineへそのまま渡す。同じ入力からC-03が新しいreadonly attribution viewを作り、`journalRecordKey`相当のcanonical identityでdedupする。

canonical wire duplicateはdiagnostic metadataとして件数を保持するが、primary lifecycle rejectionへは計上しない。dedup後に同じfamily/lifecycle identityで残る複数start/terminalだけを`duplicate-start` / `duplicate-terminal`とする。

### Consequences

#### Positive

- FR-POP-3/FR-COMP-1の既存measured非退行とFR-POP-1のcandidate安定性を同時に満たす。
- wire duplicateとdomain lifecycle collisionの意味を分離できる。
- legacy branchへの変更禁止をfixtureで直接検査できる。

#### Negative

- 同じraw rowを2つのlogical viewで扱い、dedup map分のmemoryを使う。
- developerが誤ってdedup viewをlegacy consumerへ渡すriskがあるため、type/variable命名とintegration testが必要。
- report上でscan line count、canonical duplicate count、candidate countの異なる母集団を説明する必要がある。

#### Security and compliance impact

入力を変更・修復せず、read-only派生viewだけを作るためdata safetyが高い。duplicateを黙って削除せずmethodologyで明示し、監査可能性を保つ。

### Alternatives Rejected

Option Bは明示要件FR-POP-3に違反する。Option Cはcandidate件数と重複理由を誤らせ、FR-EVT-5に違反する。Option Dは共有mutable stateと再構成推定を導入し、NFR-2/7を弱める。

### Reversibility

低〜中。公開report母集団に関わるため実装後の変更はsnapshot/consumerへ影響する。ただしbranch separation自体は内部構造であり、要件が変わらない限り安定させる。

## ADR-003: canonical semantic reportとfail-closed typed pipelineを採用する

### Status

Accepted — Requirementsのprimary reason、恒等式、3format parityから一意に導出。

### Context

Issue #2695はMarkdown/CSV/JSONに同じpopulation、rejection、category、coverage、outlier、methodologyを要求する。また不完全なstage/start/terminal/identityを推定で補ってはならず、zero/empty populationでNaN/Infinityを出してはならない。format別の再計算やnullable primitiveの流通はdriftとfail-openを生む。

### Options

- **Option A — typed pipeline + one semantic model**: parser/decoder/accountantが判別unionを返し、C-05が1つの`StageAttributionReport`を構成し、rendererは表現だけを行う。逆戻しは中。
- **Option B — format-specific aggregation**: 各rendererが必要な値を独自計算する。局所実装は簡単だがparity driftが高い。逆戻しは困難。
- **Option C — best-effort inference**: missing fieldをtimestamp/window/runtime graphから補完してcoverageを増やす。数値は増えるがNFR-3とIssueの非推定境界に違反する。逆戻しは困難。
- **Option D — reuse runtime graph projection**: existing snapshot attributionをreport sourceにする。実装量は減るがlatest-wins/containment意味論、欠落過去graph、terminal不在が本用途と不一致。逆戻しは中。

### Decision

Option Aを採用する。

- C-02はclosed vocabulary、smart constructor、`AttributionResult`を所有する。
- C-03はdecode/lifecycle段階でrejectしたcandidate groupごとに固定precedenceのprimary reasonを1つ返し、accepted candidateだけをC-01へ渡す。
- C-01だけがC-05 window selection→C-03 decode→C-04 accounting→C-05 composeをorchestrateする。既存`composeReport`は互換seamとして残し、新規`composeReportWithAttribution`が`AttributionResult`を返す。
- C-04は全eligible windowを単一呼出しで評価し、positive typed interval、全window会計、candidate identity単位の1 dispositionを返す。`accounted`は複数window contributionを持てるため、同一candidateの`outside-window`二重生成を構造上排除する。恒等式違反はtyped internal faultにする。
- C-05はC-04を呼ばず、C-03 rejectionとC-04 dispositionの非交差性を検証して1つのsemantic modelを作る。nullable statisticsは`number | null`で表し、NaN/Infinityを入れない。
- C-01の`main`はtyped internal faultをstderr + exit 1へ写像し、成功時だけ3rendererへsemantic valueを渡す。

### Consequences

#### Positive

- 3formatのparityを同じobjectへのprojectionとして検証できる。
- invalid candidateは無音廃棄されず、理由とsecondary diagnosticsを持つ。
- empty populationと実数0を区別できる。
- accounting invariant failureを正常candidate rejectionと分離できる。

#### Negative

- domain typeとmapping codeが増える。
- existing report typeへ大きなappend-only sectionが加わり、fixture更新が必要。
- format固有の可読性のため同じsemantic fieldを異なる行構造へ写像する作業は残る。

#### Security and compliance impact

malformed payloadをtyped boundaryで止め、raw本文を無制限に出力しない。reason vocabularyとmethodologyが監査可能になる。runtime graphや周辺eventからの推定を排除し、evidence provenanceを保つ。

### Alternatives Rejected

Option BはFR-OUT-4に反する。Option CはNFR-3とOut of scopeの非推定規則に反する。Option Dは`architecture.md`が示す別意味論と欠落データを本reportへ混入させる。

### Reversibility

中。renderer内部の写像は変更しやすいが、公開semantic fieldとreason vocabularyはconsumer contractになる。field名とreasonは実装前にFunctional Designで固定し、以後append-onlyとする。

## Cross-ADR constraints

- ADR-001のmodule分割はADR-002のbranch isolationを物理的に強制する。
- ADR-002のattribution viewだけがADR-003のcandidate decoderへ入る。
- ADR-003のsemantic modelだけをADR-001のrendererが読む。
- いずれのADRもIssue #2695のscopeを縮小せず、新規計装、意味カテゴリへの推定配分、モデル/ハーネス軸、window identity修正を導入しない。

## Gate acceptance checks

- dependency graphにcycleがない。
- 既存measured branchへcanonical dedup edgeがない。
- candidate/event-set/interval/statistics/output/CLI/testの全requirement groupにownerがいる。
- 各ADRに2案以上のalternatives、security/compliance impact、negative consequences、reversibilityがある。
- 新規AWS/UI/database/runtime dependency/CI jobが設計に含まれない。
