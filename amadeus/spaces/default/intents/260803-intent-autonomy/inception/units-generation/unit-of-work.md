# Unit of Work 定義 — Vertical Redo

## 上流入力とUnit semantics

| 上流成果物 | 使用内容 |
|---|---|
| `application-design/components.md` | M00〜M09の正規owner、状態、外部seam |
| `application-design/component-methods.md` | wire/API、reducer、transaction、receipt contract |
| `application-design/services.md` | production orchestrationとend-to-end flow |
| `application-design/component-dependency.md` | module import方向と共有resource |
| `application-design/decisions.md` | ADR-001〜011の制約とtrade-off |
| `requirements-analysis/requirements.md` | USR-01〜10、FR/NFR/CON、58 Issue AC |

Unitはmodule ownershipではなく、利用者から観測可能で独立に合否判定できるvertical behaviorを所有する。M00〜M09のownerは上流設計どおりであり、複数Unitが同じowner moduleへ段階的に変更を加え得る。各変更はそのUnit内でproduction caller、audit/status/replay、harness contractを同時に閉じ、未消費interfaceやdormant adapterを残さない。

## U1 — loop-monitor-runtime

- **目的:** #2095のLoop Monitorを、manifest authoringから既存workflow上のJudge/latch/resumeと5harness検証まで利用可能にする。
- **含む変更:** M00 wire value、M01 compile、M02 reducer、M06 event delivery / route orchestration、M07 event registry / replay / status、M08 native capabilityとgeneric `LiveAuthorizationPort` / protected authorization / commit binding、M09 contract/live fixture。
- **責務:** schema fail-closed、cycle/ignore/threshold、canonical graph revision、bounded history、pending Judge、closed route、latch short-circuit、evidence/retry resume、session/clone replay、credential-attested環境をsecretなしのcommitted live authorizationへ変換する共通経路。
- **境界:** Quality obligationの意味、autonomy grant、常駐runner、PR状態を所有しない。
- **独立合否:** synthetic workflowからproduction M06/M07 pathを通してthreshold前後、自然退出、crash replay、同一fingerprint短絡を検証し、現行5harnessで同じcontract、opt-in Judge liveを実測できる。
- **配布モデル:** 既存Bun CLIと5harness package faceへembedded。新processなし。
- **相対複雑度:** L。
- **規模:** 2,200〜3,400行。
- **再利用:** graph/runtime、audit shard/lock、package/setup/promote、Bun harness fixtures。U2/U3/U5はこのgeneric live authorizationを再利用し、別経路を作らない。
- **制約:** M02へquality/grant語彙を入れない。M09はtest/live runnerのままでproduction stateを変更しない。Judge providerの物理的exactly-once保証範囲はFunctional Designで閉じる。

## U2 — quality-repair-runtime

- **目的:** #2096のQuality Repair Pluginを、activationからproduction repair/stall/replayと5harness検証まで利用可能にする。
- **含む変更:** M03 Plugin、M01 contribution compile、M06 preflight/reviewer handoff/route apply、M07 quality event/status/replay、U1で成立したM08/M09 harness pathのquality behavior拡張。
- **責務:** `semi/full`必須・`none`human opt-in、blocking evidence正規化、T/T+1 projection、initial/collecting/strict/threshold、fixed-point/churn/regression、replan先行、repair-stalled、局所review cap後の新cycle。
- **境界:** gate/question認可、external Plugin manifest #2065、固定総retry cap、新artifact mandatory化を所有しない。
- **独立合否:** production stage flowでreviewer/sensor/produces evidenceを収集し、T-1非発火、初回T replan、replan後T stalled、Request Changes非変換、cross-session state維持を検証する。5harness contract/liveでは同じbehaviorを実測する。
- **配布モデル:** first-party embedded Pluginと既存harness behavior extension。flag/配線/testを同じUnitで追加する。
- **相対複雑度:** L。
- **規模:** 1,500〜2,400行。
- **再利用:** Plugin composition/trust、reviewer runtime、sensor results、produces/completion evidence、U1 Monitor/harness path。
- **制約:** advisory sensorをblockingへ昇格せず、error/incompleteを成功扱いしない。M02 algorithmをforkしない。

## U3 — intent-autonomy-runtime

- **目的:** #2067の`none / semi / full`、Intent grant、自動裁定、停止/再開を既存workflowと現行5harnessで利用可能にする。
- **含む変更:** M04 grant、M05 decision、M06 gate/question/park/resume統合、M07 grant/decision/replay/status基礎、M08 capability/registryのautonomy contract行、M09 deterministic harness contract。U1/U2のsafe loopを利用する。
- **責務:** human-provenance付きmode/grant原子遷移、standing grant migration diagnostic、candidate全体のreserve/replay/revalidate、policy→norm/history→election→recommendation、deterministic decision ID、atomic `GRANT_EXERCISED + AUTO_DECIDED + effect`、NORM_CONFLICT / AWAITING_HUMAN / REPAIR_STALLED、harness-neutral result。
- **境界:** completed decision review、credential-attested live completion evidence、PR/merge、外部runner lifecycleを所有しない。
- **独立合否:** `none/semi/full`表、Walking Skeleton、team child Intent、legacy fail-closed、crash boundary、grant active + workflow suspended、通常起動でのresume、5harness同一contractをproduction M06/M07 pathで検証する。
- **配布モデル:** 既存Bun CLIと5harness native capability projection。autonomy contract flag、実装、配線、contract testを同じUnitで追加する。live completion flagはU5まで有効化しない。
- **相対複雑度:** XL。
- **規模:** 3,000〜4,800行。
- **再利用:** real `HUMAN_TURN`、gate/question option effects、election CLI、norm/history、Event Registry、U1/U2 harness path。
- **制約:** synthetic human、権限拡張、TTL/usage budget、standing grant自動変換を禁止する。caller booleanでgrant exerciseをcommitしない。

## U4 — autonomy-review-observability

- **目的:** 自動裁定をactive/completed Intentで確認し、real human turnでaccept/flagできるread/review/status/telemetry behaviorを閉じる。
- **含む変更:** M05 decision record/query、M07 read model・completed限定append・status・Event Registry/OTel、M06 projection/UX、5harness contract snapshot。
- **責務:** question/options/selected/decider/basis/grant/evidence/degradation表示、unreviewed queue、target Intent明示、sealed auditへの`AUTO_DECISION_REVIEWED`限定追記、rollbackなしのself-fix/self-feature提案、human/machine status。
- **境界:** Intent再open、過去event変更、新Intent自動作成、一般append例外を所有しない。
- **独立合否:** active/completed fixtureに対するlist/detail、cross-Intent decision ID拒否、real turn provenance、accept/flag、seal維持、UX snapshot、OTel registryを検証する。
- **配布モデル:** 既存CLI status/replay/read commandsとEvent Registry projection。
- **相対複雑度:** M。
- **規模:** 900〜1,500行。
- **再利用:** M07 audit query/lock、status projection、Event Registry/OTel、U3 decision projection。
- **制約:** completed workflow lifecycleや成果物を変更しない。credential/evidenceの未redact payloadを表示・保存しない。

## U5 — five-harness-intent-completion

- **目的:** #2067の現行5harness opt-in liveとIntent terminal completionを、認可provenanceと同一revision evidenceで閉じる。
- **含む変更:** U1で成立したM08 generic live authorizationを利用するreceipt validation / five-harness completion、M09各native autonomy live scenario、M06/M04/M07 atomic terminal transition、U4 completed review/statusとの整合、package/promote drift。
- **責務:** credential-attested environment、authorization commit receipt、Judgeとelectionまたはloud degradation観測、revision/package/registry/environment/trace/attestation binding、skip非pass、必須5件、grant completed、workflow null、`WORKFLOW_COMPLETED` atomicity、session/process/compaction/clone persistence。
- **境界:** credential保存、本番不可逆操作、Kiro/Kiro IDE live対応、PR/merge、人間以外によるauthorizationを所有しない。
- **独立合否:** Claude Code、Codex、Cursor、OpenCode、Kimi Codeのcontract/live receiptを同一revisionへ束縛し、欠損/skip/mismatch/偽authorizationを拒否し、5件成功時だけterminal transactionをcommitする。completed decision reviewも継続可能である。
- **配布モデル:** 既存opt-in live driver、Bun harness runner、single registry/package pipeline。`autonomyLive` flag、native scenario、receipt validator、completion wiring、testを同時に有効化する。
- **相対複雑度:** L。
- **規模:** 1,700〜2,700行。
- **再利用:** package digest、OTel trace、temporary workspace、live opt-in convention、U3/U4 contract/replay fixtures。
- **制約:** secret/tokenをrecordへ保存しない。5harnessの一部成功やKiro系を完了代替にしない。Core algorithmをharnessへ複製しない。

## 横断Definition of Done

- 各Unitが既存CLIから実行できるend-to-end behavior、canonical audit/status/replay、決定論的testを持つ。
- 新interface/flag/adapterには同じUnit内のproduction consumerとfail-closed testがあり、dormant slotを残さない。
- module import方向は`component-dependency.md`、interfaceは`component-methods.md`、service flowは`services.md`、選択は`decisions.md`へ追跡できる。
- `requirements.md`の割当sliceを満たし、#2065、#1241、PR integration、runner/supervisor、新stageを導入しない。
- generated distributionは正本から再生成し、contract/replay/drift testsをgreenにする。

## Reviewer remediation status

| Fresh cycle iteration 1 blocker | 修正 |
|---|---|
| U1/U2 liveがU5のauthorizationに依存 | generic LiveAuthorizationPort、protected authorization event、commit bindingをU1に含め、U2以降が再利用する |
| NFR-DET/RELのownerが粗い | Monitor、decision/result、grant side effect、live receipt、canonical state、latch short-circuit、resume provenanceへ意味分割してprimary ownerを再割当した |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T10:43:42Z
- **Iteration:** 1
- **Scope decision:** none

U1/U2 live ACにgeneric authorization経路がなく、NFR-DET/RELのsemantic ownerが複数behaviorを一括しているため独立合否を閉じられない。

### Findings

- BLOCKER | U1/U2は独立合否に5 harnessのopt-in live実測を含むが、上流M09はCommittedLiveExecutionAuthorizationなしにlive invocationを開始できず、そのLiveAuthorizationPort、protected authorization、commit bindingはU5だけの変更範囲である。U1/U2単独では2095-AC12・2096-AC17を実行できない。U5への依存を追加するとU1→U2→U3→U4→U5との循環になるため、generic live認可経路を先行verticalへ含めるかlive AC ownerを再分割する必要がある。
- BLOCKER | NFRの数値coverageは23/23だが意味的primary ownerが閉じていない。NFR-DET-001はMonitorだけでなくU3のdecision ID・result envelopeを含むのに全体をU1 primaryとし、NFR-REL-002の同一latch fingerprint短絡はU1の責務なのにNFR-REL-001〜003全体をU3 primaryとしている。behavior別に分割しないと各Unitの独立した合否判定と責任範囲が一致しない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T10:49:29Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件は解消済み。generic live authorizationはU1内でproduction wiringと検証まで閉じ、U2〜U5が再利用できる。NFR-DET/NFR-RELもbehavior別primary ownerへ分割された。5 vertical Unit、非循環DAG、実装順のStage 2.8委譲、module owner/import方向、USR/FR/NFR/58 AC coverageにBLOCKERはない。

### Findings

- FOLLOW-UP | U5はunit-of-work.mdでU1のgeneric live authorizationを直接再利用すると記述する一方、behavior DAGではU1への直接edgeがなくU3経由の推移的依存だけである。topology上の実害はないが、U1 APIをU5が直接呼ぶのか、U3 behavior経由で利用するのかをFunctional Designで明確化するとdirect-edge semanticsが一意になる。
