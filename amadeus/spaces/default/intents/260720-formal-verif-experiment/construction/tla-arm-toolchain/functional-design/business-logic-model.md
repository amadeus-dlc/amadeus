# Business Logic Model — tla-arm-toolchain

## 上流契約と責務

本Unitは、`unit-of-work.md` のtla-arm-toolchain責務、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8、`requirements.md` のFR-3/FR-4/FR-7/FR-8・NFR-1/NFR-3、`components.md` のArm T Adapter / TLC Toolchain、`component-methods.md` のfinite profileとcomplete exploration契約、`services.md` の`fetch-tlc` / `run` lifecycleを実装可能なarm-specific toolchainへ落とす。fixture identity、注入patch、TS oracle、eligibility、winnerを知らない。

本UnitはU3 `execution-evidence`のarm-neutral process / evidence portへraw outcomeとnormalized `CellResult`を渡す。ただしE-FVEU3FD1によりU3はreviewer max-exhausted・iteration 2後是正の第三review未実施であり、最新sensor PASSでもREADYではない。本設計は既決public portだけに依存し、U3の人間裁定までintegration readinessやwalking-skeleton完成を主張しない。

処理は次の4境界に分ける。

1. TLC jarを固定releaseから取得し、checksum一致後だけimmutable cacheへpublishする。
2. public election contractとclosed `TlcProfile`から有限TLA+ module / cfgを生成・検証する。
3. verified jarとfrozen modelをoffline process portで1回実行する。
4. raw TLC streamをversion-specific parserでcounterexampleまたはcomplete exploration proofへ正規化する。

## Artifact acquisitionとoffline verification

artifact descriptorはversion `1.7.4`、URL `https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar`、SHA-256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`、redirect origin allowlist `{github.com, objects.githubusercontent.com, release-assets.githubusercontent.com}`、stream hard cap 128 MiBのclosed valueである。content lengthはidentity根拠にせずhash-only integrityとし、headerがある場合はpositiveかつhard cap以下、headerなしはstream counterでhard capを強制する。HTTPS以外、allowlist外redirect、version / filename drift、cap超過を拒否する。

取得はcache外のtemporary fileへstreamし、完了後にbyte lengthとSHA-256を再計算する。一致時だけcontent-addressed cache pathへexclusive atomic renameし、同一hash・同一bytesは再利用する。同一path異bytes、partial file、checksum mismatchを削除対象stagingへ隔離し、verified cacheへ昇格させない。cache receiptはdescriptor identity、actual hash / length、取得時刻、JVM versionを持つ。

model check前の`verifyOffline`はcache fileを毎回再hashし、descriptorとreceiptを照合する。offline run portはnetwork capability、proxy環境変数、download callbackを受け取らず、verified local jar pathだけを許す。cache欠損やdrift時に自動downloadへfallbackせず`HARNESS_ERROR`根拠を返す。

## Finite model construction

profileはvoters `{V1,V2,V3}`、valid choices `{C1,C2,C3}`、choice input token `ValidChoice ∪ {UNKNOWN_CHOICE}`、submittedAt / amend-ref tokens `{T0,T1,T2,INVALID_FORMAT,INVALID_DATE}`、receivedAt `{T0,T1,T2}`、reference input token `AcceptedRef ∪ {UNKNOWN_REF}`、GoA `{1..8}`、`T0 < T1 < T2`、各voter initial最大1 / amend最大1、global hold最大1、workers=1を固定する。`AcceptedRef`は現在のaccepted ledgerにある同一voterの`(voter, submittedAt, arrivalSeq)`だけから動的に生成する。generatorはunknown fieldや別cardinalityを拒否し、frozen public contract bundle hashとprofile identityをmodule header receiptへ埋める。

stateは`accepted` ballot列、`late` ballot列、voter別initial / amend budget、global hold budget、hold marker列、arrival sequence、optional tally receipt、last outcomeを有限tupleとして表す。validation precedenceはoriginal / amend共通で`UNKNOWN_CHOICE -> INVALID_TIMESTAMP`、amendだけその後に`UNKNOWN_REF`とし、最初の1 errorだけを`lastOutcome`へ置く。複数invalid inputでも後順位invariantはreject outcomeを要求せず、ledger / budget不変だけを要求する。各actionのprecondition / effectは次で閉じる。

- `SubmitOriginal(v,c,s,r,g)`: initial budgetが1で、`c ∈ ValidChoice`かつ`s ∈ {T0,T1,T2}`ならarrival sequenceを1増やしacceptedへappendしてbudgetを0にする。unknown choiceは第一順位、invalid submitted tokenは第二順位のreject outcomeとし、ledger / budgetを不変にする。tally済みで`r > tally.receivedAt`ならacceptedでなくlate laneへappendする。
- `SubmitAmend(v,ref,c,s,r,g)`: amend budgetが1で、choice、timestamp、refの順に検証する。全validならkind=amendをappendしbudgetを0にする。最初のinvalidだけをoutcomeにし、ledger / budgetを不変にする。
- `Tally(r)`: 未tallyかつacceptedが存在する場合、voterごとにsubmitted token order最大、同値ならarrival sequence最大のballotをresolveする。`blocks=Cardinality({b: b.goa=8})`、`discuss=Cardinality({b: b.goa=5})`、`favor=Cardinality({b: b.goa∈{1,2,3,6}})`、`against=Cardinality({b: b.goa∈{7,8}})`とし、`blocks>=1 -> Hold(BLOCK)`、それ以外で`discuss>=2 -> Hold(DISCUSSION_NEEDED)`、それ以外で`favor+against=0 -> Hold(QUORUM_SHORT)`、それ以外はchoice countのunique argmaxをEstablished、同数topを`Hold(TIE)`としてreceiptを固定する。
- `RecordHold`: tally receiptが`Hold(reason)`、hold marker列が空、global hold budgetが1の場合だけ同じreasonのmarkerを1件appendしbudgetを0にする。Established後、reason不一致、2件目はstate不変でrejectする。
- `Stutter`: 全有効budget消費またはenabled actionなしのterminal stateだけで全variableを不変にする。

TLCは上記action union以外を`Next`へ含めず、到達可能state graphの新規stateなし固定点まで探索する。

公開predicateは次の機械判定式を互いにnamed invariantとして表す。ここで`AppendDelta`は遷移前後のledger差、`Resolved[v]`はvoter vの選択ballot、`Eligible`はresolvedからGoA 4を除いた集合である。

| Invariant | Mechanical condition |
| --- | --- |
| `ChoiceWinner` | hold条件なしのtallyでは`winner`が`argmax(c ∈ ValidChoice, Cardinality({b ∈ Eligible: b.choice=c}))`の唯一要素。最大同数ならwinnerなし / tie hold |
| `UnknownChoiceRejected` | `c=UNKNOWN_CHOICE`のstepは最優先で`AppendDelta=0`かつchoice / budget / tally不変、outcome=`UNKNOWN_CHOICE_REJECTED` |
| `ReceivedAtAxis` | tally後のsubmissionは`late ⇔ receivedAt > tally.receivedAt`であり、submittedAt比較をlatenessへ使わない |
| `InvalidTimestampRejected` | choice validかつ`s ∈ {INVALID_FORMAT,INVALID_DATE}`のstepは`AppendDelta=0`かつbudget不変、outcome=`INVALID_TIMESTAMP_REJECTED`。choice unknown時はstate不変だけを要求 |
| `AmendSubmission` | valid amendは`AppendDelta=1`、appended kind=`amend`、ref保存、amend budgetだけを1→0にする |
| `UnknownRefRejected` | choice / timestamp validで`ref=UNKNOWN_REF`またはacceptedに不在なら`AppendDelta=0`かつbudget不変、outcome=`UNKNOWN_REF_REJECTED`。上位error時はstate不変だけを要求 |
| `PerVoterResolution` | `Resolved[v]=argmax(b ∈ accepted: b.voter=v, (SubmittedOrder[b.submittedAt], b.arrivalSeq))`かつvoterごとに高々1件 |

GoA hold判定は上記cardinality式をresolved集合上でblock、discussion-needed、quorum-shortの順に適用し、それらがない場合だけ`ChoiceWinner`を評価する。fixture ID、既存regression名、期待failure、注入branchはmodule / cfg / metadataに含めない。generator outputはcanonical source bytes、cfg bytes、profile / contract identitiesに加え、各invariant nameをmodule source span / formula identityへ写像するfrozen mapを持つ`FrozenModelBundle`としてhashし、freeze後は変更しない。

## TLC invocationとoutput parse

command builderはverified jar、module、cfg、workers=1、明示tool output modeだけをargv arrayで生成し、shell補間しない。run profileはvendor token `OpenJDK`、runtime version `26.0.1`、起動前にhashするjava executable、heap flags `-Xms256m -Xmx1024m`、`-Dfile.encoding=UTF-8 -Duser.language=en -Duser.country=US -Duser.timezone=UTC`、locale `en_US`、timezone `UTC`を固定する。version出力、vendor token、executable identity、flagsがfreeze receiptと違えば起動しない。suite残時間と120秒の小さい方をdeadlineとし、process group timeoutでは子processを終了してstdout / stderr / exit / signalを保存する。

parserはTLA+ tools 1.7.4の次のanchored marker grammarを受理する。

| Class | Accepted marker |
| --- | --- |
| Success terminal | exact `Model checking completed. No error has been found.` |
| Statistics | `N states generated, M distinct states found, Q states left on queue.`（N/M/Qはbase-10 non-negative integer、complete時Q=0） |
| Depth | `The depth of the complete state graph search is D.`（Dはbase-10 non-negative integer） |
| Invariant violation | `Error: Invariant NAME is violated.`（NAMEはclosed 7 invariantの1件） |
| Trace header | exact `Error: The behavior up to this point is:` |
| Trace state | `State K: <...>`、Kは1始まり連番で、後続state bodyを次markerまで保持 |
| Failure marker | 上記invariant / trace以外の`Error:`、任意の`Warning:`、`Finished computing initial states: ...`後にterminal欠損 |
| Informational | version banner、progress、fingerprint、elapsed / finished line、blank。verdict根拠に使わない |

stream decode failure、semantic classに属さない`Error:` / `Warning:`、successとcounterexampleの同時出現、複数terminal、truncated trace、state count overflowをparse errorとする。優先規則はprocess timeout / spawn failure → grammar failure / contradictory markers → valid invariant counterexample → valid success completionの順である。invariant violationではmarkerのNAMEをfrozen invariant mapへ照合し、source locationをそのmodule spanから導出する。ordered state traceとstatisticsをparseし、state object keyをcanonical順、trace step順を保持してcounterexample identityを生成する。unit fixtureは上表の各markerについてpositive / near-miss / duplicate / contradictory streamを固定する。

`NOT_DETECTED`は次を全て満たす場合だけ成立する。

1. exit 0かつSuccess terminalがexactly one件ある。
2. generated states、distinct states、queue=0、search depthを非負integerとしてparseできる。
3. timeout、tool error、parse warning、incomplete / depth warningが0件である。
4. terminal reasonが`EXHAUSTED`で、有限profile identityとworkers=1が実行manifestに一致する。
5. completion markerとstate statisticsが同一run identityへ結合される。

valid invariant counterexampleは`DETECTED`、上記complete proofは`NOT_DETECTED`、それ以外はraw failure reason付き`HARNESS_ERROR`へ正規化する。exit code単独やcounterexample文字列不存在からverdictを推定しない。

## Failure flowとtest境界

acquisition、cache、model、process、parse errorはclosed discriminatorとraw artifact referenceを保持する。model / toolchain failureを`NOT_DETECTED`へ、unrelated Java failureを`DETECTED`へ変換しない。同一inputの再実行はverdictとcounterexample identity一致を要求する。

unit test fixtureでwrong checksum、partial / corrupt cache、offline cache miss、profile drift、fixture情報混入、unknown marker、truncated trace、counterexample正規化、completion marker欠損、state stats欠損、timeout、exit 0+warning、workers driftを検証する。integrationはU3の最終FD人間裁定後に専用U5 harnessでのみ成立を主張する。
