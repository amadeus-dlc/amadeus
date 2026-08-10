# Security Design — population-interval-accounting

## Scope and upstream applicability

本設計はpresent consumeである `business-logic-model.md` のC-04 pure interval algebraとpopulation accountingを対象とする。`security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentであり、新規NFR IDは発明しない。`performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitでは非適用で、対応design outputもpruneされている。

NFR Requirements由来のdeclared requirement IDは存在しない。必要なNFR requirementはupstreamでmissingであり、Requirements Analysisの関連statement（`requirements.md:283-293`、`:299-309`）は設計contextとしてだけ参照する。C-04はvalidated domain valueだけを受け、filesystem、network、credential、renderer、audit writerを所有しない。

## Trust boundaries and threat model

C-04はU-01/U-02/C-05からreadonly typed valueを受けるが、配列全体の一意性、safe integer加算、母集団全単射、ratio恒等式はpopulation boundaryで再検査する。型が個別valueを証明しても、集合としての重複・欠落・overflowは依然として不正になり得る。

| Threat | Example | Control | Failure result |
|---|---|---|---|
| cross-intent/stage attribution | 時刻だけが重なる別intent windowへclip | intentとstageが完全一致するwindowだけを選択 | clip候補外、推定なし |
| double counting | nested/parallel/adjacent intervalを単純加算 | copy sort後のcategory unionとglobal unionを分離 | 重複秒は1回だけ計数 |
| idle leakage | idle spanをobservableへ含める | intent別union済みIdleIndexをclip後に差し引く | positive fragmentだけ保持 |
| arithmetic corruption | non-finite、unsafe integer、負残余、zero denominator | 入力/途中/結果でsafe integer・finite・net>0を検査 | `accounting-invariant` |
| partial success exposure | 一部windowだけ成功してreportへ渡る | single invariant transactionで全入力→全出力を検証 | windows/dispositionsを一切返さない |
| disposition duplication/loss | 1 candidateが複数statusまたは0 status | candidate identity全単射と重複検査 | population-scoped invariant |
| mutable aliasing | sort/unionがcaller配列を書換える | copyしてsortし、新しいreadonly fragmentを返す | input snapshot不変 |
| algorithmic amplification | 全corpus intervalを1巨大配列へ収集 | window/category bucket、O(cw + k log k)、O(w+c+k) | bounded design、samplingなし |

## Integrity and fail-closed controls

1. window ID、candidate ID、net denominator、safe integer endpointsの集合前提を入口で検査する。
2. `clipInterval`は境界接触をpositiveへ膨らませず、`subtractIntervals`はexclusionをunionしてから差し引く。
3. candidateごとにsame intent + same stageの全eligible windowを評価し、`accounted` / `outside-window` / `empty-after-idle`のちょうど1 dispositionへ写像する。
4. category内unionと全category global unionを別計算し、category間overlapをobservableへ重複加算しない。
5. `observable + unattributable = net`とfinite rateをwindowごと、candidate/disposition bijectionをpopulation全体で検査する。
6. 1件でも違反すればtyped `accounting-invariant`だけを返し、部分結果やfallback推定値を公開しない。

## Authentication, confidentiality, and compliance controls

認証・認可、TLS、at-rest encryption、secret management、security header、CSRF/XSSは非適用である。pure in-process libraryでremote principal、credential、browser、persistent store、privileged operationを持たない。

compliance controlは、別intentの時間を混入させないこと、idleを観測可能時間へ含めないこと、入力corpusを変更しないこと、恒等式違反時に推定reportを出さないことである。C-04はraw audit payloadやPIIを受けず、safe identityとinteger intervalだけを処理する。

## Requirement traceability

NFR Requirements stageがskipされたため、全行のdeclared requirementはmissingである。各decisionをRequirements Analysisのcontext evidenceへ関連付けるが、そのNFR番号をNFR Designのaddressing IDとして採用しない。

| Security/integrity design decision | Declared NFR requirement | Context evidence and rationale |
|---|---|---|
| safe integer/finite/seconds/rate恒等式のtransaction検査 | Missing (`security-requirements.md` absent) | `requirements.md:283-285`のcorrectness statementを結果生成条件へ具体化する |
| canonical sort、input-order/Map-order非依存 | Missing | `requirements.md:287-289`のdeterminism statementをtyped populationへ適用する |
| same intent/stageだけのclip、曖昧値の非採用 | Missing | `requirements.md:291-293`のfail-closed statementをinterval matchingへ具体化する |
| 部分windows/dispositionsを返さないtyped invariant error | Missing | `requirements.md:291-293`と`:303-305`をatomic pure seamへ具体化する |
| bucket処理、O(cw + k log k)、samplingなし | Missing | `requirements.md:299-305`をcorrectness-preserving capacity境界へ具体化する |
| copy sort、input非破壊、I/O import禁止 | Missing | `requirements.md:307-309`のread-only statementをmodule境界へ具体化する |
| auth/TLS/secret/headerを追加しない | Missing | external trust/resource boundaryが存在しないため非適用であり、対応するcontext statementもない |
| pipe drain、exit ladder、process retryをC-04へ持ち込まない | Missing | `requirements.md:295-297`のpipe/process statementはC-01 shell ownerの責務で、pure libraryの本Unitには非適用 |

## Verification

- boundary-touch、nested、identical、adjacent、overlap、disjoint intervalのtable/PBTを実行する。
- idleが中央・全体・window外にあるfixtureでfragmentとdispositionを検証する。
- same timestampの別intent/別stage windowへcontributionがないことを検証する。
- duplicate candidate/window、unsafe sum、negative residual、bijection欠落で部分結果なしの`err`を検証する。
- input順、Map insertion順、category contribution順をshuffleし、byte-equivalent semantic resultを検証する。
- input arrays/recordsのdeep snapshotが前後で一致することを検証する。

## Residual risks

worst-case O(cw)はwindow/candidate集合が同時に大きい場合のCPU riskを残すが、本Issueは固定runtime SLAを定めていない。correctnessを犠牲にするindex推定やsamplingは行わず、実測で必要になった場合だけ、same intent/stage keyによる意味保存indexを別変更として検討する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:46:03Z
- **Iteration:** 1
- **Scope decision:** none

security/logical componentの必須セクションと上流business logic整合性は概ね充足しているが、要件IDの扱いとdesign-decision単位のtraceabilityに未解決BLOCKERがある。

### Findings

- BLOCKER | 両成果物はNFR Requirements由来のdeclared requirement IDが存在しないと明記しながら、Requirements AnalysisのNFR-1〜7を「fallback addressing scheme」「代替正本」として割り当てている。stage contractはNFR Requirementsが宣言したID以外を使用せず、必要な要件がmissingならその旨をdesign elementごとに記載するよう要求しているため、現在の表ではIDの正当性を検証できず、design-decision単位のNFR traceabilityを満たさない。さらにlogical-components.mdはNFR-1〜7を代替正本と称しながらNFR-4の割当または非適用理由を示していない。
- BLOCKER | logical-components.mdのtraceability表はrequirementから大括りのownerへの割当だけで、単一ファイル境界、7 componentの分割、failure domain、shared-resource方針、capacity上限、各isolation ruleという個別design decisionに対するrequirementまたは「declared requirementなし」の対応を示していない。stageが要求するdesign-decision単位のtraceabilityとして不十分である。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:47:45Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1の2件のBLOCKERは解消された。NFR Requirements由来IDが不在であることを明示し、Requirements Analysisの番号をaddressing IDへ転用していない。security-designとlogical-componentsはいずれも個別design decisionごとにMissing、context evidence、verification seamまたは非適用理由を示している。必須セクション、present/omitted upstreamの扱い、security controls、logical component inventory・failure domain・blast radius・shared resource・isolation、およびbusiness-logic-modelとの整合性にも未解決BLOCKERはない。

### Findings

- None
