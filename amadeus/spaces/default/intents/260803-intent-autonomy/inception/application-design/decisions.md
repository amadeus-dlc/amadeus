# アーキテクチャ決定記録

## 上流入力と承認方法

本書は`requirements-analysis/requirements.md`、`codekb/amadeus/architecture.md`、`codekb/amadeus/component-inventory.md`を根拠とする。各ADRは本stageの承認ゲートで一括承認されるまでProposedであり、ゲートの`GATE_APPROVED`がAcceptedの監査証拠になる。

## ADR-001: 短命CLIのモジュラーモノリスを維持する

- **Status:** Proposed
- **Context:** Coreは外部runner / scheduler、常駐supervisor、harness固有pollingを持たず、将来harness追加でalgorithmをforkしてはならない。
- **Options:**
  - A — 短命CLI + deep in-process modules: 既存運用と一致し、再生可能。process間はresult envelopeで疎結合。逆転しやすい。
  - B — Core常駐supervisor: 自動再起動は容易だが、#2067外の運用・lifecycle・credential責務をCoreへ持ち込む。逆転困難。
  - C — harness別loop: native統合は直接的だがalgorithm重複と将来追加コストを生む。
- **Decision:** Aを推奨し、M00〜M08を同一CLI process内の深いモジュールとして実装する。
- **Consequences:** 既存lock / audit / Bun実行を再利用できる。process再起動policyは外部runnerがWorkflowResultから決める。
- **Alternatives Rejected:** BはCON-003違反、CはNFR-MNT-003違反。
- **Reversibility:** 高い。外部runnerは後から追加できる。

## ADR-002: Generic Monitor、Quality Plugin、Autonomyを三分離する

- **Status:** Proposed
- **Context:** #2095は汎用cycle、#2096は品質policy、#2067は認可を所有する。相互に意味論を混ぜると再利用とIssue依存順が崩れる。
- **Options:**
  - A — M02 / M03 / M04-05を分離し、M06が順序付ける。
  - B — 1つのAutonomousLoopEngineへ統合する。call surfaceは小さいが、品質・grant・generic cycleが同時変更になる。
- **Decision:** A。M02のインターフェースはnormalized event、disposition付きcompiled Monitor、Pluginが計算したmanifest subset constraint、pending Judgeを含むprojection、Judge resultだけに限定する。M02はconstraintとcontinue / latchだけを強制し、route IDの品質意味論はM03、WorkflowResult生成はM06が所有する。Quality Pluginは初回Tで`[replan]`、replan後Tで`[repair-stalled]`のsingletonだけを渡す。
- **Consequences:** Pluginやharness追加でCore algorithmを変更しない。Coordinatorのtransaction順序テストが重要になる。
- **Alternatives Rejected:** BはFR-LMC-012とNFR-MNT-001に反する。
- **Reversibility:** 中。公開内部SPIの安定後は分離維持が必要。

## ADR-003: Auditを正本、runtime projectionを再生成可能cacheとする

- **Status:** Proposed
- **Context:** session / compaction / cloneを跨ぐ必要があり、per-clone scratchは正本にできない。一方、event deliveryごとの全audit再走査も禁止される。
- **Options:**
  - A — canonical audit + bounded materialized projection。
  - B — runtime graph / local DBを正本にする。
  - C — 毎eventでaudit全走査する。
- **Decision:** A。cold resumeは関連eventを線形replayし、通常deliveryは対象Monitorと`T + 1` windowだけ更新する。M03 projectionはT、連続non-progress、replan-since-progress、最大T+1 snapshotを持ち、initial / collecting / strict-progress / thresholdを決定的に返す。Judge予約はconstraintを含む完全なrequestをcanonical auditへ記録してpendingへ再生し、S01は同じinvocation IDをidempotency keyに`invokeOnce`する。
- **Consequences:** crash recoveryと性能を両立する。projection schema / replay fixtureが必要。
- **Alternatives Rejected:** BはNFR-REL-001違反、CはNFR-PERF-001違反。
- **Reversibility:** 中。projection実装は交換可能だがaudit event contractは安定化する。

## ADR-004: Plugin source形式と正規化済み内部SPIを分離する

- **Status:** Proposed
- **Context:** 初期first-party Quality PluginはMonitor等を寄与するが、#2065 external manifest標準はblockerではない。
- **Options:**
  - A — first-party source adapterをprivate形式として持ち、M01へ渡す`NormalizedContribution`だけを安定化する。
  - B — 今回external Plugin manifest v2を標準化する。
  - C — Quality PluginをCoreへ直書きする。
- **Decision:** A。信頼済みcomposition content digestを検証後、source adapterがMonitor / evidence provider / route rule / required outputを内部SPIへ正規化する。M03がmode別activationを先に解決し、M01はactiveと判定されたcontributionだけをcompileする。
- **Consequences:** #2065は将来別adapterを追加できる。初期source形式を外部互換契約として宣伝しない。
- **Alternatives Rejected:** Bはscope拡大、CはFR-QRP-001とFR-LMC-011に反する。
- **Reversibility:** 高い。source adapterを追加・交換できる。

## ADR-005: Intent grantをstanding grantと別event familyにする

- **Status:** Proposed
- **Context:** 既存standing grantはTTL、phase opt-in、Walking Skeleton exclusionを持つ。新grantはIntent-scoped、TTLなし、非消費で意味が異なる。
- **Options:**
  - A — `INTENT_GRANT_ISSUED / REPLACED / REVOKED / COMPLETED / EXERCISED`を新設する。
  - B — 既存`GRANT_ISSUED / REVOKED`へoptional fieldを足す。
- **Decision:** A。人間起点の`none ↔ semi`、`none / semi → full`、full grant置換、`full → none / semi`を閉じたcommandで表す。`AUTONOMY_MODE_CHANGED`とgrant発行・置換・revokeを同一transactionに束縛する。Intent完了時の`INTENT_GRANT_COMPLETED`はcompletion identityを根拠とするsystem transitionであり、新しい人間turnを要求しない。旧eventはmigration readerだけが読む。
- **Consequences:** legacyと新認可を混同しない。Event Registry / OTel / replay更新が増える。
- **Alternatives Rejected:** Bは欠損fieldによる暗黙認可と自動変換のリスクが高い。
- **Reversibility:** 低〜中。event名は永続contractになるためComprehensive fixtureで固定する。

## ADR-006: 自動裁定を二相行使する

- **Status:** Proposed
- **Context:** grant失効、norm conflict、crash時に副作用だけが先行してはならない。
- **Options:**
  - A — audit-backed reservationと原子的workflow event transactionを使う二相行使。
  - B — process内reservationだけを使い、crash後に候補を再探索する。
  - C — existing effect適用後にauditする。
- **Decision:** A。`M04 occurrence / option set認可 → M05 answer選択 → selected option専用effect / scopeからM04 candidate生成 → validate → full candidate + digest + projection revisionをINTENT_GRANT_EXERCISE_RESERVEDへappend → replay / M04 internal revalidate → atomic commitまたはabort`を固定する。caller提供のrevalidated booleanを廃止し、crash後もquestion / occurrence / selected option / scope / effectを同じcandidateから復元する。
- **Consequences:** transaction前後のcrashで部分適用が生じず、冪等性と監査可能性を得る。reservation / commit / abort / atomic effect eventのreplay fixtureが必要になる。
- **Alternatives Rejected:** Bは選択したgrant identityを失い、Cは副作用だけが先行するcrash windowを作る。
- **Reversibility:** 低。順序は安全不変条件である。

## ADR-007: Harness registryを全配布面のsuperset正本にする

- **Status:** Proposed
- **Context:** 現在は7 package face、6 host directory、5 self-install face、今回の5 live対象が分散unionとして存在する。
- **Options:**
  - A — 7 descriptorのregistryに`hostDir / selfInstall / autonomyContract / autonomyLive / native capabilities`を持たせ、各面を導出する。
  - B — 今回の5harnessだけを新registryへ移し、Kiro系は既存listへ残す。
- **Decision:** A。Kiro / Kiro IDEをregistryとpackage driftへ残し、autonomy/live flagsだけfalseにする。
- **Consequences:** 新harness追加の判断箇所が1つになる。setup / scripts / runtimeの派生面を生成またはcheckする必要がある。M08はcredential-attested authorizationをprotected audit eventへcommitし、M09 receiptをauthorization / environment / trace / attestationへ束縛する。同一Intent / revision / package digest、Judge実測、electionまたはloud degradation、認可provenanceを満たす5件だけがCompletionEvidenceになる。
- **Alternatives Rejected:** Bは二重正本を固定し、既存配布面を削除し得る。
- **Reversibility:** 中。descriptor fieldは追加可能だがID / hostDir写像は安定contract。

## ADR-008: Reviewer上限後は新しい局所cycleへhandoffする

- **Status:** Proposed
- **Context:** `reviewer_max_iterations`は局所安全capとして残し、Quality Repair全体へ固定capを置かない必要がある。
- **Decision:** 上限後のBLOCKERをM03へ渡し、Judgeがrepair / replanを選んだ場合は新`reviewCycleId`でiterationを1へ戻す。`previousReviewCycleId`と`judgeInvocationId`をaudit linkageにし、quality epochとnon-progress履歴は維持する。
- **Consequences:** 局所capを破らず複数cycleで修復でき、表面的replanによる永久loopもM02 / M03が検出できる。
- **Alternatives Rejected:** iterationを上限以上へ増やす案は既存reviewer runtime contractを破る。全体固定capはFR-QRP-011違反。
- **Reversibility:** 中。identity fieldはevent contractになる。

## ADR-009: Terminal result envelopeを外部runnerとの唯一の接点にする

- **Status:** Proposed
- **Context:** Coreはrunnerを実装しないが、再起動可否を機械判定可能にする必要がある。
- **Decision:** M06が`completed / parked / failed`の閉じたWorkflowResultを返す。`parked`だけが`retryable=true`とstructured resume conditionを持つ。`failed`は現在呼出しだけを終端しworkflow=`running`を維持する。`completed`は専用`planIntentTerminal`だけが生成し、M08完了証拠、M04 grant completion / workflow null、M06 workflow completionを同一transactionへ含める。
- **Consequences:** runnerはauditや内部stateをpollせずに済む。schema変更は互換性管理が必要。
- **Alternatives Rejected:** PRやGitHub状態をenvelopeへ含める案、failedでIntentをsuspend / 終端する案は対象外または回復不能状態を作る。
- **Reversibility:** 中。field追加は可能、既存意味の変更は禁止。

## ADR-010: Completed Intent reviewは限定append pathにする

- **Status:** Proposed
- **Context:** completed auditは封印されるが、自動裁定の`accept / flag`は後から記録する必要がある。
- **Decision:** M07に`AUTO_DECISION_REVIEWED`専用append validatorを設け、入力でtarget Intent UUIDを必須にする。target sealed shard内のdecision IDと、`VerifiedHumanTurn.intentUuid`が指すcanonical audit内のreal turnを別々に検証した場合だけ、turn reference付き`accept / flag`をtargetへ許可する。decision digestからIntentを逆引きしない。
- **Consequences:** audit sealを保ったままreview historyを追加できる。general append pathは引き続き拒否する。
- **Alternatives Rejected:** Intent再open、過去event変更、別storeへのreview保存はFR-OBS-004 / NFR-PRV-001に反する。
- **Reversibility:** 低。completed auditの安全例外であるため狭く固定する。

## ADR-011: Quality Repair Pluginのactivationをmode境界でfail-closedにする

- **Status:** Proposed
- **Context:** `semi / full`は不備を健全になるまで手当するためQuality Repair Pluginを必須とする。一方、`none`で暗黙起動すると人間主導の期待を変える。
- **Options:**
  - A — `semi / full`は開始前必須検証、`none`は既定offで人間provenance付きopt-inのみ許可する。
  - B — 全modeで常時有効化する。
  - C — 全modeで任意Pluginとして扱う。
- **Decision:** A。M03がcanonical auditから`QUALITY_REPAIR_OPTED_IN / OUT`と人間provenanceを再生し、stage開始前にactivationを解決する。`semi / full`で欠落・未信頼・破損ならfail-closed、`none`では再生済み人間opt-inが有効な場合だけactive contributionをM01へ渡す。`none`のopt-inはgate / questionを自動承認する権利を付与しない。
- **Consequences:** modeのUXを保ちつつ、半自律・完全自律では品質収束loopを必須化できる。activation stateとprovenanceのreplay fixtureが必要になる。
- **Alternatives Rejected:** Bは`none`の意味を変え、Cは`semi / full`が不健全な成果のまま進行し得る。
- **Reversibility:** 中。将来別の品質Pluginへ交換できるが、mode別安全境界は維持する。

## 決定の要件追跡

| ADR | 主な要件 |
|---|---|
| ADR-001 | CON-002〜003、NFR-MNT-003 |
| ADR-002 | FR-LMC-011〜012、FR-QRP-001、NFR-MNT-001 |
| ADR-003 | FR-LMC-004〜010、NFR-REL-001、NFR-PERF-001〜003 |
| ADR-004 | FR-LMC-011、FR-QRP-001 / 012、NFR-MNT-002 |
| ADR-005 | FR-AUT-008〜010、FR-GRT-001〜009、NFR-SAF-004 |
| ADR-006 | FR-GRT-007、FR-DEC-002〜006、NFR-DET-001〜002 |
| ADR-007 | FR-HAR-001〜007、NFR-MNT-003 |
| ADR-008 | FR-QRP-009〜011 |
| ADR-009 | FR-STP-001〜007 |
| ADR-010 | FR-OBS-001〜005、NFR-PRV-001 |
| ADR-011 | FR-QRP-002〜003、FR-AUT-001〜007、NFR-SAF-001 |
