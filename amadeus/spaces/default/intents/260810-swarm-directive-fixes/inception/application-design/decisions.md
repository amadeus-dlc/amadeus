# Architecture Decisions

入力: [`requirements.md`](../requirements-analysis/requirements.md)、CodeKB [`architecture.md`](../../../../codekb/amadeus/architecture.md)、[`component-inventory.md`](../../../../codekb/amadeus/component-inventory.md)。

## ADR-1: 監査バックのoutcome projectionをselectorの正本readerにする

### Context

failure/abort evidenceは既存監査にあるがselectorが読まず、state mutationや`report failed`追加も候補になり得る。FR-OUT-1〜10は新stateなし、Stop hook変更なしを要求する。

### Decision

既存eventをpure reducerでfoldし、intent/stage/Unit/attempt・batch相関済みoutcome projectionを`next`の判断入力にする。必須join keyが欠けるeventは推定せず診断unionでfail-closedする。Retry/SkipはUnit Z、AbortはConstruction全体とする。

### Consequences

- 既存append-only証跡から再構成でき、crash後も決定的。
- 相関不足はfail-closedになり、必要なら既存eventへ最小field追加が要る。
- Unit pool terminal outcome、BOLT_FAILED裁定、SWARM_BATON_RETURNED batch closureをcanonical audit seqでjoinし、同一seqの矛盾はerrorにする。
- readerの回帰テストがwriter存在テストより重要になる。

### Alternatives Rejected

- stateへ新terminal marker: 二重台帳と新stateを増やす。
- `report --result failed`: stage forward resultとUnit halt裁定を混同する。
- Stop hook変更: engine欠落をhookへ漏らす。

### Reversibility

高い。pure reducerとadapterを外せば既存writer/state契約へ戻せる。

## ADR-2: flat consumesをeffective producer populationへfan-outする

### Context

選択肢はflat N×M、placeholderの全面absent化、structured field。ユーザーは限定改訂を裁定した。

### Decision

succeeded Unitだけをeffective populationとして既存flat `consumes`へ展開する。cancelledは候補外、failed/pending残存はerror。fan-out後にpresence splitする。

### Consequences

- 既存directive consumerはschema変更なし。
- path数はN×Mに増えるが、この形状変更は明示要件。
- legitimate placeholder round-tripを保存できる。

### Alternatives Rejected

- 全placeholderを`consumes_absent`: pinned contractを不要に破る。
- structured per-unit field: consumer全体のmigrationを要求しscope過大。
- representative Unit:全Unit入力を欠落させる。

### Reversibility

中。flat schemaは維持するが、順序とpopulation semanticsが公開契約になる。

## ADR-3: Issue別vertical Unitを並行実装し、#2833を先行gateする

### Context

2能力は`amadeus-orchestrate.ts`を共有するが、ユーザーはUnit設計とConstruction swarmでの並行化、BoltごとのPRを要求する。

### Decision

U1は#2833のprojectionとfailure-selector配線、U2は#2834のfan-out/reviewer guardとconsume-resolution配線をそれぞれ1 vertical Unit・1 PRとして所有する。U1/U2は同一swarm batchで実装する。P1のU1をwalking-skeletonとして先に収束・承認し、U2はU1 gate前に実装しても承認を先行させない。U1着地後もU2がmergeableならheadを維持し、実競合またはbranch protectionが最新baseを要求する場合だけrebase/updateする。横断検証はBuild and Test stageで行い、両Issueを含む第三PRを作らない。

### Consequences

- 並行Bolt間のshared-file conflictを避ける。
- 追加moduleは単一利用だが、変更理由・test seam・PR ownershipを分離するdeep boundaryとして正当化される。
- 1 Issue = 1 Unit = 1 Bolt = 1 PRを保持する。
- 共有fileのsemantic ownershipを分け、収束/merge順序はU1→U2で直列化する。
- self-featureのwalking-skeleton gateはU1へ維持する一方、ユーザー裁定により今回intentだけU2の並行実装を許す。U2の承認はU1より先行しない。

### Alternatives Rejected

- orchestrator内へ全実装: 2 Boltが同じ巨大fileを編集し並行不能。
- 1巨大Boltまたは旧共有U3: PR分離・複数Issue単一PR禁止に反する。
- pure/integrationの5 Unit案: 1 Issue=1 Unit原則と横断PR禁止に反する。
- walking-skeleton完全単独実行: 今回の明示的なConstruction swarm並行化指示を満たさない。

### Reversibility

中。moduleをinline化できるが、要求されないrefactorは行わない。

### Amendment Evidence

2026-08-10 の Delivery Planning 中、ユーザーは最初に「Issue別に直列分割」、amendment reviewの再BLOCKER後に「並行実装＋#2833先行ゲート」を選択した。本 amendment はUnit/PR/source ownershipとgate timingだけを変更し、C1/C2/C3/C4/C5 の公開contractを変更しない。
