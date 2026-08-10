# Security Design — candidate-evidence-inventory

## Scope and upstream applicability

本設計はpresent consumeである `business-logic-model.md` のC-03 attribution-only decoderを対象とする。`security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentであり、新規NFR IDは発明しない。`performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitでは非適用で、対応design outputもpruneされている。

Requirements AnalysisのNFR-2（`requirements.md:287-289`）、NFR-3（同`:291-293`）、NFR-5（同`:299-301`）、NFR-6（同`:303-305`）、NFR-7（同`:307-309`）を代替正本とする。新しいnetwork、credential、storage、PII sourceは導入せず、read-only派生viewだけを作る。

## Trust boundaries and threat model

trust boundaryは、既存journal codecが正規化したaudit rowと、そのrowが運ぶencoded Event Set envelopeをC-03が受け取るin-process callである。rowは構文的に読めても、payload、schema、digest、event-set identity、intent、stage、lifecycle fieldは不正または欠落し得る。

| Threat | Example | Control | Containment |
|---|---|---|---|
| malformed payload | 欠落、invalid JSON、非object、inner shape不正 | payload→JSON/object→schema→digest→set ID→inner eventの検証可能範囲を評価 | outer envelope 1 rejection |
| integrity mismatch | canonical bytesとdeclared digestの不一致 | canonical bytesからdigestを再計算し比較 | `digest-mismatch`、intervalなし |
| identity collision/replay | 同一Event Set IDの複数envelope、wire duplicate | canonical wire dedup後にEvent Set ID duplicateを第2 passで判定 | duplicateを明示計数 |
| confused deputy | 別intent/stage eventをtarget windowへ混入 | 同一canonical envelopeの明示intent/stageだけを継承 | missing/mismatch rejection |
| lifecycle ambiguity | duplicate/missing start/terminal、missing identity | source fallbackを含む決定的groupとfixed precedence | candidate group単位 rejection |
| evidence amplification | decode不能payloadからinner件数を推定 | 安全に確定できない場合はouter 1件だけをcandidateとする | 件数の捏造を防止 |
| raw evidence disclosure | rejection textへpayload全文を出す | inventoryはclosed reason、safe source identity、countだけを公開 | raw payloadをrendererへ渡さない |
| algorithmic instability | filesystem/Map順や入力重複で結果変動 | canonical order、code-point tie-break、O(n log n)上限 | 再実行可能なinventory |

## Event Set integrity controls

1. payloadが存在しJSON objectとして解釈できる範囲だけをparseする。再帰的なschema探索や動的code executionを行わない。
2. supported schema version、digest、Event Set ID、inner event array/type/timestamp/originを独立findingとして収集する。
3. digestはcorruption detectionであり、発行主体のauthenticationやdigital signatureとは扱わない。digest一致だけでintent/stage/lifecycleを信用しない。
4. unsupported schemaとdigest mismatchが併存しても、検証順ではなくU-01の17値precedenceを一度だけ適用する。
5. duplicate Event Set IDは全outer envelopeをparseした第2 passで判定し、canonical wire duplicateとlifecycle duplicateを混同しない。
6. loop-monitor/transactionの現schemaに明示start/terminalがない場合、将来名のpattern matchやtimestamp近接で補わない。

## Authorization, confidentiality, and compliance controls

認証・認可、TLS、at-rest encryption、secret management、security header、CSRF/XSSは非適用である。C-03はpure libraryでremote principal、credential、browser、persistent store、privileged operationを持たない。

compliance controlは「入力監査証跡を変更しない」「推定を観測値として表示しない」「malformed evidenceを理由付きで保持する」の3点である。新しいretention、PII processing、external transferを作らない。raw audit payloadをinventory error文字列へ複製せず、既存corpusのaccess policyを拡張しない。

## Failure handling and data safety

- candidate/envelopeの入力不正は`CandidateInventory.rejected`へ隔離し、CLI全体のavailabilityを不必要に落とさない。
- unexpected codec defect、closed vocabulary exhaustiveness違反だけをprogrammer faultとしてfail-fastさせる。
- filesystem、writer、repository、runtime projectionをimportせず、input rowとaudit shardをrepair・overwriteしない。
- `Set`/`Map`はinvocation-localで、global cacheやcross-run stateを持たない。
- sampling、approximation、parallel raceを導入せず、229 shard・136,011 row以上でも同じ検証集合を維持する。

## Requirement traceability

NFR Requirements成果物はexpected-absentのため、次表はRequirements Analysisの既存IDをfallback addressing schemeとして使う。新しいIDは宣言しない。

| Security design decision | Satisfied fallback requirement | Trace rationale |
|---|---|---|
| payload→shape→schema→digest→ID→inner eventの検証可能finding収集 | NFR-3 | 不完全なevidenceをaccepted intervalへ昇格せず理由付きで閉じる |
| digest再計算とEvent Set ID duplicateの第2 pass | NFR-2、NFR-3 | 同じcorpusで同じintegrity findingを再現し、collisionを黙って採用しない |
| explicit intent/stageだけの継承とwindow containment禁止 | NFR-3 | 帰属不能evidenceを推定で補わない |
| canonical order、source fallback、fixed precedence | NFR-2 | filesystem/Map/input順にprimary reasonと件数を依存させない |
| outer failureを1件としinner件数を推定しない | NFR-2、NFR-3 | 再現不能なcandidate増幅を防ぎ、failure単位を固定する |
| candidate input failureとprogrammer faultの分離 | NFR-3、NFR-6 | corpus不正を診断へ保持し、実装defectを正常rejectionへ偽装しない |
| raw payloadをinventory error文字列へ複製しない | NFR-7 | read-only派生処理のdata exposureを増やさない |
| writer/repository/runtime projection非依存、input非破壊 | NFR-7 | corpusをrepair・overwriteせず既存access boundaryを維持する |
| O(n log n)上限、sampling/approximationなし | NFR-5、NFR-6 | current corpus scaleでもcorrectnessとtest seamを維持する |
| auth/TLS/secret/headerを追加しない | 対応するdeclared requirementなし | remote principal、network、credential、browser boundaryが存在しないため非適用 |

digestをauthentication/signatureとして扱わない判断にも対応するdeclared requirementはない。これは新しいsecurity機能ではなく、既存digest contractの保証範囲を越えないための非主張である。

## Verification

- malformed JSON、unsupported schema + digest mismatch、duplicate Event Set IDをtable-driven testで検証する。
- same intent/identityを別stageで再利用するfixtureによりgroup非干渉を検証する。
- canonical wire duplicateがlifecycle duplicate reasonへ入らないことを検証する。
- 9 familyのaccepted/rejected inventoryと、pairを持たないfamilyのmissing-boundary rejectionを検証する。
- shuffled inputとMap insertion順を変えてaccepted/rejected order、primary/secondary reason、countが一致することを検証する。
- input array/objectのdeep snapshotを前後比較し、変更がないことを検証する。

## Residual risks

local audit corpusを読めるprocess権限は既存CLI boundaryの責務であり、C-03自身はaccess controlを追加しない。digestは署名ではないため悪意あるwriterの真正性は証明しないが、本Issueは既存event evidenceの整合性評価に限定され、新しいtrust rootを発明しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:38:41Z
- **Iteration:** 1
- **Scope decision:** none

required sectionsとpresent/expected-absent upstreamの列挙、主要なsecurity control、failure domain・isolation・shared resource設計は概ね揃っている。一方、設計判断単位のNFR traceabilityと、上流contractが要求するduplicate Event Set ID第2 passのlogical component ownershipが未確定である。

### Findings

- BLOCKER | security-design.mdはNFR Requirements成果物がexpected-absentであることと代替正本のNFR-2/3/5/6/7を列挙するだけで、Event Set検証、raw payload非開示、fail-fast境界、read-only性など個々のsecurity design decisionをどのrequirementが満たすかへ追跡していない。stage contractは各design decisionのrequirement traceを要求しているため、少なくともcontrolまたはcontrol群ごとに既存fallback requirementへの対応を明示し、対応requirementがない判断はその旨を一行で示す必要がある。
- BLOCKER | business-logic-model.mdとsecurity-design.mdはduplicate Event Set IDを全outer envelope parse後の第2 passで判定する契約だが、logical-components.mdではEnvelope Decoderの入力が単一outer rowで、他componentの責務にもcross-envelope ID index、duplicate finding付与、影響対象envelopeの確定が割り当てられていない。failure domain表にもcanonical wire duplicateしかなくEvent Set ID collisionのblast radiusがない。このままでは必須integrity controlをどのcomponentがどの時点で実施するか一意に実装できないため、第2 passのowner、保持するshared-by-invocation state、findingの付与対象、failure domainをlogical component設計へ固定する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:40:35Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の2 BLOCKERは解消された。security-design.mdは設計判断単位のfallback requirement対応とrequirement非存在時の扱いを追加し、logical-components.mdはduplicate Event Set ID第2 passの専任component、invocation-local state、全関係outerへのfinding付与、collision failure domainを明示した。required sections、upstream coverage、security/logical component completenessも上流contractと整合している。

### Findings

- FOLLOW-UP | raw payload非開示をNFR-7 read-only safetyへ対応付けているが、logical-components.mdが示すNFR-7のverification seamはinput snapshot不変とwriter import禁止であり、confidentiality/data disclosureを直接検証しない。実装を妨げる矛盾ではないためBLOCKERではないが、要件の保証範囲を過大化しないよう、この判断を「対応するdeclared requirementなし」とするか、NFR-7が disclosure controlまで含む根拠をtrace rationaleへ明記するとよい。
- FOLLOW-UP | Event Set Identity Indexはcollision findingを付けたoutcomeを生成する一方、本文では直ちにenvelope-level rejected candidateを作るとも読める。digest mismatch等との複合findingでfixed precedenceとsecondary diagnosticsを確実に維持するため、実装時はIndexで最終rejectionへ早期縮退せず、decoder findingとcollision findingを同じEvidence Evaluator経路へ渡すこと。現設計にはfinding集合保持とfixed precedenceの規則があるため現時点のBLOCKERではない。
- NIT | business-logic-model.md冒頭のflowchartとtext fallbackはgroup keyからexplicit stageを省略した旧表記のままである。詳細規則とlogical-components.mdはstageを含めて整合しているため、図のlabelも `intent × stage × family × identity` に揃えると誤読を防げる。
