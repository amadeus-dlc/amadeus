# Domain Entities — repository-adoption

## 境界と上流トレーサビリティ

本モデルは `unit-of-work.md` の U4 data ownership、`unit-of-work-story-map.md` の evidence／CI／distribution acceptance、`requirements.md` の FR-05〜15・NFR-01〜09、`components.md` の C1〜C6／I1、`component-methods.md` の evidence・candidate・trusted ledger interface、`services.md` のbootstrap／short-lived execution境界を具体化する。

schemaと検証algorithmはU1が所有し、U4はrepository固有のinstance、承認、正本値、統合reportを所有する。新規database、remote service、mutable registry、UI entityは作らない。

## Entity一覧

| Entity／Value Object | Owner | 永続性 | 役割 |
|---|---|---|---|
| `RevisionIdentity` | U1 schema／U4 value | evidence内immutable | full Git object IDでsource revisionを固定 |
| `ArtifactDigest` | U1 schema | evidence内immutable | exact bytesのSHA-256同一性 |
| `RawCensusEvidence` | U1 command／U4保管 | version-controlled evidence | 未分類raw／exempted／effective findingとscan receipt |
| `ClassificationLedger` | U4＋人間 | version-controlled evidence | raw identityごとのTP／FPと根拠 |
| `ApprovalReceipt` | quality review＋人間gate | version-controlled evidence | classificationとraw digestの承認 |
| `ApprovedCensusEvidence` | U1 command／U4保管 | version-controlled evidence | 検証済みraw＋classification＋approval |
| `BaselineCandidate` | U1 command／U4保管 | version-controlled evidence | `B_pre`／`B0`集合差分とcandidate bytes |
| `BootstrapProvenance` | U1 command／U4昇格 | version-controlled canonical support | 初回previous-setの由来を閉じる |
| `CanonicalBaseline` | C5 schema／U4 value | version-controlled canonical ledger | committed effective TP identity集合 |
| `CanonicalExemptionLedger` | C5 schema／U4 value | version-controlled canonical ledger | approved intentional-drop identity集合 |
| `CiRevisionContext` | U4 CI wiring | process-local | eventとtrusted base revisionの対応 |
| `GitObjectMaterializationReceipt` | U4 CI wiring | process-local／command evidence | trusted base objectの存在と取得経路を証明 |
| `CommandDeadline` | U4 CI wiring | process-local | 外側30秒TERM／5秒KILL境界 |
| `CommandEvidence` | U4 | version-controlled report参照 | command、environment、exit、result digest |
| `TimingSampleSet` | U4 | version-controlled evidence | cold／warm各5値と合否 |
| `DistributionReceipt` | U4 | version-controlled evidence | package／promotion／parity検証結果 |
| `AdoptionEvidenceReport` | U4 | version-controlled summary | 全acceptanceの参照とoverall status |

## `RevisionIdentity` と `ArtifactDigest`

`RevisionIdentity` はfull SHAだけを表し、branch名、tag、short SHA、current HEAD aliasを保持しない。all-zero、missing、非hex、repositoryで解決不能な値はvalid instanceにならない。

`ArtifactDigest` はartifactのexact bytesから作り、pathや更新時刻を同一性の代用にしない。digest対象にはschema versionとcanonical serializationを含める。digest mismatch時は新しいentityを生成せず、既存artifactも変更しない。

## `RawCensusEvidence`

| 属性 | 制約 |
|---|---|
| revision | valid `RevisionIdentity` |
| manifestDigest | expected source manifestのdigest |
| ruleBundleDigest | exact rule bundleのdigest |
| semanticDependencyDigest | TypeScript／catalog／tsconfig依存のdigest |
| expected／scanned count | 完全走査で一致 |
| missing／extra | 完全走査で双方空 |
| findings | canonical identity順、重複なし |
| raw／exempted／effective sets | U1 schemaの集合関係を満たす |
| evidenceDigest | entity全体のcanonical bytes digest |

`C_pre-raw` と `C_post-raw` は別instanceであり、修正前後revisionを入れ替えない。同じrevision／contractから再生成したinstanceはbyte-identicalでなければならない。

## `ClassificationLedger`

`ClassificationLedger` は一つの raw evidence digestにだけ従属する。entryは次を持つ。

| 属性 | 制約 |
|---|---|
| findingIdentity | 対象raw findingsにちょうど1件存在 |
| classification | `TP | FP` の閉集合 |
| rationale | trim後非空 |
| reviewer | 空でない人間reviewer identity |
| sourceAnchor | ruleId、path、lineとraw digestへの参照 |

ledger全体はentryをidentity順にcanonical serializeし、classification digestを持つ。raw findingsとentryのcardinalityは1対1であり、未分類、重複、余剰を許さない。

## `ApprovalReceipt`

`ApprovalReceipt` はraw evidence digest、classification digest、reviewer、approval timestamp、human gate audit event identityを必須とする。preとpostのreceiptは別entityであり、対象digestが完全一致しない場合は無効である。

receiptは「分類内容を承認した」事実だけを表し、canonical baselineへの昇格を自動承認しない。candidate promotionには別の人間review recordが必要である。

FP entryが1件でもあるclassificationにはbaseline promotion用 `ApprovalReceipt` を発行しない。classifier／catalog／fixture修正後の新しいraw digestには新しいclassificationとreceiptを作る。

## `ApprovedCensusEvidence`

`ApprovedCensusEvidence` は `RawCensusEvidence + ClassificationLedger + ApprovalReceipt` の検証済み結合である。元entityを埋め替えず各digestを保持し、TP identity集合、precision計算の分子／分母／率をcanonical formで持つ。FP identity集合は必ず空である。

Lifecycleは次の一方向である。

`raw → classified → approved` または `raw／classified → rejected`

`rejected` から同じdigestのapprovalへ遷移しない。修正する場合は新しいclassification digestと新しいreceiptを作る。

## `BaselineCandidate`

`BaselineCandidate` はapproved pre／post evidenceだけから生成する。

| 属性 | 制約 |
|---|---|
| preEvidenceDigest | approved preを参照 |
| postEvidenceDigest | approved postを参照 |
| bPreIdentities | preのeffective TP集合 |
| b0Identities | postのeffective TP集合 |
| retained | `B_pre ∩ B0` |
| removed | `B_pre - B0` |
| added | `B0 - B_pre`、空であること |
| issueMapping | removed各identityを #1874／#1878へ全単射対応 |
| candidateDigest | candidate canonical bytesのdigest |

`B0` が `B_pre` の真部分集合でない、addedが非空、removedとissue mappingが一致しない場合はcandidate entityを生成しない。

## `BootstrapProvenance`

`BootstrapProvenance` はcandidateを初回canonical baselineへ昇格するための由来を保持する。

- pre／post revision identity。
- raw／classification／approval／approved evidence digest chain。
- `B_pre`／candidate `B0` digest。
- initial exemption identity set／digest。
- schema、rule、semantic dependency digest。
- generation command version。
- candidate人間review record。

状態は `candidate-created → human-reviewed → promoted` の一方向である。`promoted` 後もprovenanceはimmutableで、通常CIがbase ledgerを読めるようになった後はprevious-setとして再利用しない。

## Canonical ledgers

`CanonicalBaseline` と `CanonicalExemptionLedger` は別aggregateである。

| 共通属性 | 制約 |
|---|---|
| schemaVersion | U1 contractの固定version |
| identities | canonical順、重複なし |
| previousDigest | 通常はtrusted baseの同種ledger exact bytes digest。初回だけ別入力bootstrap provenance内のprior identity-set digest |
| currentDigest | entity canonical bytes digest |
| provenance | bootstrapまたは通常reviewed changeへの参照 |

baseline identityはeffective TPを表し、exemption identityは有効な `NSD002` intentional-dropだけを表す。一つのidentityを意味の異なる両ledgerへ暗黙複製しない。通常遷移はtrusted previous setのsubsetだけを許し、追加と同数置換はfailed transitionである。

初回baselineのprior集合は `B_pre`、初回exemptionのprior集合はinitial exemption setである。bootstrap provenanceはledger外の別entityとしてU1の `loadTrustedPreviousLedgers` へ渡し、current `previousDigest`、approved pre digest、candidate current digestをそれぞれのfieldで検証する。canonical ledgerへ新しいsource-kind unionを追加しない。

## `CiRevisionContext`

| 属性 | 制約 |
|---|---|
| eventKind | `pull_request | push` の採用対象 |
| suppliedRevision | event payloadのexact value |
| trustedBaseRevision | validation済みfull SHA |
| sourceField | pull request base SHA または push before SHA |

Lifecycleは `received → validated → consumed` または `received → invalid` である。invalidからcurrent HEAD／merge-base推測へ遷移しない。consumed時は同じrevisionをroot scriptの一つのargvとして渡す。

## `GitObjectMaterializationReceipt`

receiptはtrusted base revision、origin identity、初回object存在判定、fetch実施有無、再確認結果を持つ。checkoutはfull historyを取得し、objectがない場合だけ形式検証済みliteral full SHAを同じoriginからdepth 1で取得する。fork PRでもbase repositoryのbase SHAだけを扱い、fork headのwrite権限やsecretを持たない。

状態は `checking → available`、または `checking → fetching → available | failed` である。`failed` からHEAD／merge-base推測へ遷移せず、gate commandを開始しない。

## `CommandDeadline`

| 属性 | 値／制約 |
|---|---|
| owner | U4 CI outer process wrapper |
| termAfter | 30秒 |
| killAfterTerm | 5秒 |
| backupJobCeiling | 1分 |
| timeoutExit | 124 |
| killedExit | 137 |

deadlineはNFR-01の15秒合否とは別のhang containmentであり、性能thresholdを緩和しない。U1内部timeoutが先にtyped Error／exit 2を返す場合はそれを維持し、外側timeout時は124／137を `CommandEvidence` に記録する。

## `CommandEvidence`

`CommandEvidence` は検証commandごとに次を持つ。

- full current revisionと、必要な場合のtrusted base revision。
- cwdとargv配列。
- Bun／OS／runner contract。
- source manifest／ledger／config digest。
-開始／終了timestampとduration。
- exit code、stdout digest、stderr digest。
- expected outcomeとactual outcome、pass／fail。

stdout／stderr全文をsummary entityへ複製せず、immutable raw resultへのpathとdigestを持つ。secretとcredentialは属性に含めない。

## `TimingSampleSet`

| 属性 | 制約 |
|---|---|
| environment | `ubuntu-latest`、Bun 1.3.13、frozen install済み |
| coldSamples | 独立fresh workspace由来の5値 |
| warmSamples | 各cold直後の同一workspace由来の5値 |
| coldMax／warmMax | それぞれ全sampleの最大値 |
| threshold | 15秒 |
| status | 両maxがthreshold以下の場合だけpass |

timeout、非0 exit、manifest差異はduration sampleにせず、measurement failureとして別に保持する。sample除外によって5値を欠損させない。

## `DistributionReceipt`

`DistributionReceipt` はcanonical source digest、packager command evidence、generated projection digest set、package drift result、promotion drift result、harness parity resultを持つ。

状態は `canonical-ready → generated → drift-verified → regression-verified` である。generated projectionの直接編集を検出した場合はfailedとなり、手修正済みprojectionを正当なreceiptへ昇格しない。

## `AdoptionEvidenceReport`

最終reportは次のsectionを必須とする。

- corpus completeness／determinism。
- fixture 100%とTP／FP precision。
- pre／post approved evidenceとidentity差分。
- baseline／exemption ratchet。
- trusted base revisionとlocal／CI parity。
- zero／partial／tool／rule／ledger failure injection。
- #1874／#1878／#1963 regression。
- cold／warm performance。
- full test／lint／typecheck／coverage。
- package／promotion／harness parity。

各sectionは一件以上の `CommandEvidence` または承認entityを参照する。overall statusは全必須sectionの論理積であり、unknown／missingをpassへ畳まない。

## Aggregate関係

関係のテキスト表現は次のとおりである。

`RawCensusEvidence` 1 → 1 `ClassificationLedger` → 1 `ApprovalReceipt` → 1 `ApprovedCensusEvidence`

approved pre 1 ＋ approved post 1 → 0..1 `BaselineCandidate` → 0..1 `BootstrapProvenance` → 0..1 `CanonicalBaseline`

trusted base `CanonicalBaseline` 1 ＋ trusted base `CanonicalExemptionLedger` 1 ＋ current ledgers 2 → 1 ratchet verdict

`CiRevisionContext` 1 → 1 `GitObjectMaterializationReceipt` → 1 `CommandDeadline` → 1 gate command → 1 `CommandEvidence`

N `CommandEvidence` ＋ 1 `TimingSampleSet` ＋ 1 `DistributionReceipt` → 1 `AdoptionEvidenceReport`

## Entity acceptance

- 各evidence段階のdigest改変、entry不足／余剰／重複、receipt流用が拒否される。
- pre／post revisionとmanifest contractが一致し、raw evidenceが反復byte-deterministicになる。
- TP／FP率の分子／分母／0件規則が再計算可能である。
- candidateのretained／removed／added集合を独立再計算できる。
- baselineとexemptionのprevious setがevent固有trusted baseから得られる。
- invalid `CiRevisionContext` がgate successへ遷移しない。
- shallow checkout／fork PR base／push beforeでmaterialization receiptが成立し、fetch失敗時はgateを開始しない。
- hang injectionが30秒TERM／5秒KILLで124／137となり、CommandEvidenceがpassにならない。
- cold／warm各5 sampleと最大値がreportから再計算可能である。
- #1874／#1878／#1963、full regression、drift guardのcommand evidenceがrevisionへ結合される。
- generated projectionの直接編集なしに `DistributionReceipt` が成立する。
-必須entityが一件でも欠けたreportはoverall passにならない。
