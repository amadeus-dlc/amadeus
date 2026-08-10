# Unit of Work Story Map — CG 観測可能区間と帰属不能残余

上流入力(consumes全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。user-stories stageはscopeで未生成のため、`requirements.md`のFRを実装ナラティブとして全数mappingする。

## Functional requirement mapping

| Requirement | Primary Unit | Supporting Unit(s) | Delivery narrative |
|---|---|---|---|
| FR-POP-1 | U-04 | U-02 | 既存scanを維持し、attribution viewだけcanonical dedupする |
| FR-POP-2 | U-04 | U-01 | typed target stageをattributionだけへ適用する |
| FR-POP-3 | U-04 | U-02 | measured raw branchへdedupを逆流させない |
| FR-POP-4 | U-04 | U-03 | net>0・一意identity windowだけをpopulation accountingへ渡す |
| FR-EVT-1 | U-02 | U-01 | closed family/category vocabularyで全candidateをinventoryする |
| FR-EVT-2 | U-02 | U-01 | Event Set schema/digest/idを検証してinner eventを展開する |
| FR-EVT-3 | U-02 | U-01、U-03、U-04 | 明示intent/stageだけを受理し、U-03は同一intent windowだけへclipする |
| FR-EVT-4 | U-02 | U-01 | family identityでstart/terminalを決定的にpairingする |
| FR-EVT-5 | U-01 | U-02、U-03、U-04 | fixed precedence、decode reason、post-accounting reason、3format countを一本化する |
| FR-INT-1 | U-03 | U-01 | integer-second半開区間で全eligible windowへclipする |
| FR-INT-2 | U-03 | U-04 | existing idle indexを差し引きpositive fragmentだけを残す |
| FR-INT-3 | U-03 | U-01 | window/category単位でnested/parallel/overlapをunionする |
| FR-INT-4 | U-03 | U-04 | global unionと残余恒等式をsemantic reportへ渡す |
| FR-STAT-1 | U-04 | U-03 | positive durationとzero-inclusive shareの母集団を分ける |
| FR-STAT-2 | U-04 | U-03 | coverage/overlapをeligible全windowから集約する |
| FR-OUT-1 | U-04 | U-01〜U-03 | measurement referenceとmethodologyに全規則を記録する |
| FR-OUT-2 | U-04 | U-01 | outlierを規定tie-breakでsortし表示N件だけsliceする |
| FR-OUT-3 | U-04 | U-02、U-03 | candidate reason、50%超window、terminal欠落をobserved factとして報告する |
| FR-OUT-4 | U-04 | U-01〜U-03 | 1 semantic modelをMarkdown/CSV/JSONへ表現する |
| FR-CLI-1 | U-04 | U-01 | `--outliers`/`--stage`をsmart constructorで検証する |
| FR-CLI-2 | U-04 | U-01 | empty/partial/invariant/usageをexit 0/1/2へ写像しread-onlyを守る |
| FR-COMP-1 | U-04 | U-02、U-03 | existing public/measured fieldsをappend-onlyで維持する |
| FR-TEST-1 | U-01〜U-04 | — | 各Unitが専用test fileでpure seamまたはCLI boundaryをsynthetic fixture/PBTで閉じる |
| FR-TEST-2 | U-04 | U-02、U-03 | current-corpus相当規模のsnapshotと再実行一致を証明する |
| FR-TEST-3 | U-04 | — | 3format各65,536 bytes超のproducer/pipe digest parityを証明する |

## NFR and cross-cutting mapping

| NFR | Owning Unit(s) | Verification |
|---|---|---|
| NFR-1 Accounting correctness | U-03、U-04 | interval PBT、population/ratio恒等式、semantic aggregate |
| NFR-2 Determinism and reproducibility | U-01〜U-04 | explicit sort、closed tuples、repeat digest |
| NFR-3 Fail-closed evidence policy | U-01〜U-04 | missing evidence rejection、typed invariant、normal report抑止 |
| NFR-4 Pipe and process reliability | U-04 | full stdout drain、oversized pipe digest |
| NFR-5 Current-corpus scale | U-02〜U-04 | 229 shard・136,011 row以上相当、O(n)/O(k log k) |
| NFR-6 Maintainability and testability | U-01〜U-04 | change-reason boundary、acyclic imports、Unit別の非交差test file、public seam test |
| NFR-7 Read-only and data safety | U-02、U-04 | input-only filesystem、tracked file前後不変、safe escaping |

## Cross-unit narratives

### Candidate rejection lifecycle

U-01がclosed vocabularyとprecedenceを定義し、U-02がdecode/lifecycle reason、U-03が`outside-window`/`empty-after-idle`を生成する。U-04はcandidate identityの非交差性を検証してfamily×primary reasonを1回だけ数え、3rendererへ同じ値を出す。

### Measured and attribution isolation

U-04がoriginal recordsをlegacy measured branchへそのまま渡し、U-02へはreadonly attribution copyを渡す。U-03/U-04が作るeligibility/accountingは既存windowの採否・秒数・exclusionへ戻らない。

### Population-wide accounting

U-04がtarget stage window selectionを先に確定し、同じeligible集合をU-02/U-03へ渡す。U-03はcandidateごとに全windowを1回評価し、1 disposition内に複数window contributionを許すことでrejection二重計数を防ぐ。

### Semantic parity and pipe completeness

U-04がU-01〜U-03のformat-neutral valueから1 reportを構成し、rendererはescapingとpresentationだけを所有する。semantic parity fixtureとoversized pipe fixtureはMarkdown/CSV/JSONすべてを同じprocess boundaryで検証する。

## Within-unit implementation narratives

- **U-01**: closed tuples/brands → smart constructors → error/disposition unions → precedence tests。
- **U-02**: attribution-only dedup → Event Set decode → family classification → identity grouping → primary/secondary diagnostics。
- **U-03**: interval primitives → population disposition → per-window/category union → global accounting/invariant PBT。
- **U-04**: window selection → semantic report → façade orchestration/CLI → 3renderer → compatibility/real-corpus/oversized integration。

これは各Unit内部のcontract依存を示すナラティブであり、UnitまたはBolt間のeconomic delivery orderではない。

## Coverage verification

- FR 25件（FR-POP-1〜4、FR-EVT-1〜5、FR-INT-1〜4、FR-STAT-1〜2、FR-OUT-1〜4、FR-CLI-1〜2、FR-COMP-1、FR-TEST-1〜3）を全数mapping済み。
- NFR-1〜7を全数mapping済み。
- U-01〜U-04は各1件以上のprimary FRとcompletion evidenceを持つ。
- `requirements.md`のIssue #2695完了条件1〜10はFR direct matrix経由でU-01〜U-04へcoverされ、scope縮小はない。
- optional `stories.md`は未生成であり未割当storyは0件。未割当FR/NFRも0件。
