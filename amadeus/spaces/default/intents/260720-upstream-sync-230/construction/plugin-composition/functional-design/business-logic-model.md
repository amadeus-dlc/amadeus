# Business Logic Model — plugin-composition

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U10はC4 Plugin Compositionとして、C5が生成したplugin bundleをhostへno-clobberでcomposeし、doctor可視化とrecord-owned dropをatomicに行う。public seamは次の正準6関数だけである。

```ts
function inspectPlugin(plugin: PluginDescriptor, host: HostSnapshot): PluginPlanResult;
function planPluginComposition(plugin: ValidPlugin, host: HostSnapshot): PluginCompositionPlan;
function applyPluginPlan(plan: PluginCompositionPlan, tx: WorkspaceTransaction): ApplyResult;
function planPluginDrop(record: PluginRecord, host: HostSnapshot): PluginDropPlan;
function applyPluginDrop(plan: PluginDropPlan, tx: WorkspaceTransaction): DropResult;
function diagnosePlugins(host: HostSnapshot): readonly PluginDiagnostic[];
```

`discoverPlugins(sourceRoot: string, io: ReadOnlyFs): readonly PluginDescriptor[]`はE-OC1裁定AによりC4内部helperである。U10はU01のschema、U02/C2のgraph compile、U09のprojected bundleを消費し、U11の`test-pro`/guide、U12のledger closureを所有しない。

## Upstream input traceability

| Input | 採用した制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | 6 public seam、temp transaction、record、U11委譲、失敗時3 surface不変 | 目的、Compose/Drop |
| `unit-of-work-story-map.md` | item 20 ownerはU10、U01/U09/U11 consumer、U12集約 | 目的、Verification |
| `requirements.md` | no-clobber、4 seam merge、fragment、self-heal compile、doctor、loud failure | Inspect、Compose |
| `components.md` | C4 inspect→plan→apply/drop union、既存C1/C2/CLI再利用、deferred面除外 | 全workflow、境界 |
| `component-methods.md` | union、7関数の正準signature、全error収集、temp verify、record-owned drop | Public seam、Failure table |
| `services.md` | inspect→plan→stage→verify→commit、workspace atomic、既存lock/audit | Transaction workflow |

## Inspect and plan workflow

1. 内部`discoverPlugins`がprojected bundleを`PluginDescriptor`として列挙する。
2. `inspectPlugin`はhost snapshotに対してsame-name stage、malformed manifest、unknown seam、clobberを全数検査する。
3. errorが一件でもあれば`{ kind: "rejected"; errors }`を返し、planやwriteを開始しない。
4. errorがなければ`inspectPlugin`が`planPluginComposition`へ委譲し、検証済み`ValidPlugin`と同じ`HostSnapshot`から決定的planを作って`{ kind: "ready"; plan }`を返す。
5. planはno-clobber stage copy、`produces`/`consumes`/`sensors`/`required_sections`の宣言merge、宣言済みfragment spliceだけを含む。shared fileではbase/precondition、plugin contribution、適用順、期待post-stateを決定的に計算する。

error precedenceや暗黙seamを追加せず、全errorを決定順で診断へ渡す。`when`評価、agents/scopes/memory/knowledge、marketplace、lockfileは対象外である。

## Shared-file contribution ownership

E-USSU10FD1はAを3–0で採用した。`PluginRecord`はshared file全体を所有せず、plugin自身のcanonical contribution、compose時base/precondition、適用順、期待post-stateだけを記録する。

- compose planはcurrent fileがbase/preconditionへ一致することを全mutation前に確認する。
- 複数pluginの寄与はrecordされた決定順で適用し、期待post-stateを正準化する。
- dropはcurrent fileがrecordの期待post-stateへ一致することを全対象についてmutation前に確認する。
- 一致時だけ対象pluginの寄与を除き、baseと残存plugin寄与からshared fileを決定的に再構築する。
- user edit、unknown drift、contribution identity不一致では復元を推測せず、三面不変でloud rejectする。

## Atomic compose workflow

1. lock取得後、未完了journalがあれば新規composeを開始せず、先に回復workflowを完了する。
2. `applyPluginPlan`はcanonical hostへ直接逐次writeせず、temp host treeへplanを適用し、C1/C2 compileとsensorを実行する。
3. commit対象となるhost、composition record、auditの全write-setとpreimageをdurable write-ahead journalへ記録し、最初のcanonical mutation前に`PREPARED`をdurable化する。
4. 同じworkspace lock下で三面write-setを適用し、すべて完了した場合だけjournalを`COMMITTED`へ進める。record/auditは一度だけ発行する。
5. handled failureはreturn前に全preimageを即時・冪等に復元する。process crashは次操作のlock取得直後に未完了journalを検出し、pre-stateへ冪等回復する。
6. recovery中のcurrent/preimage driftまたはjournal corruptionは追加mutationせずloud停止し、未回復journalがある間は新規compose/dropを禁止する。

## Atomic drop workflow

1. `planPluginDrop`はrecord-owned pathとshared-file contributionだけを候補にし、host snapshotからuser-authored ownershipを推測追加しない。
2. 全対象のcurrent期待post-state一致をmutation前に確認し、shared fileは対象寄与を除いた残存寄与から決定的に再構築する。
3. `applyPluginDrop`はtemp host treeへplanを適用し、C1/C2 compileとdoctorを実行する。
4. composeと同じjournal protocolでhost/record/auditの全write-set/preimageを`PREPARED`後に適用し、三面完了後だけ`COMMITTED`にする。
5. handled failure/crash recovery/drift停止はcomposeと同じ規則で、三面をpre-stateへ収束させる。

## Doctor projection

`diagnosePlugins`は`HostSnapshot`からplugin状態をread-onlyで投影する。compose/dropの成功を作り出すownerではなく、record、owned path、compile/doctor観測を既存diagnosticへ写像する。失敗理由はloud CLI errorとdoctorの適切な面へ出し、advisoryへ丸めて成功扱いしない。

## Failure table

| Condition | Result | Mutation |
|---|---|---|
| same-name/malformed/unknown seam/clobber | rejected + 全error | host/record/audit 0 |
| temp apply/compile/sensor failure | apply failure | host/record/audit 0 |
| shared file current drift | loud reject | 全mutation前、三面0 |
| valid compose | apply success | journal COMMITTED、三面once |
| record外path | drop plan対象外 | user bytes不変 |
| temp drop compile/doctor failure | drop failure | host/record/audit 0 |
| commit途中handled failure | recovery | 全preimage即時復元 |
| PREPARED後crash | 次操作前recovery | 新規操作禁止、pre-stateへ冪等復元 |
| recovery drift/corruption | loud stop | 追加mutation 0 |
| valid drop | drop success | journal COMMITTED、三面once |

## Verification scenarios

- same-name stage、不正manifest、unknown seam、clobberを同時fixtureで全数検出し、write 0を確認する。
- 4 seam mergeとdeclared fragment splice後のtemp treeをcompile/sensorし、成功時だけcanonical treeへ反映する。
- compile/sensor failureを各段階へ注入し、host/record/auditのpre/post bytesを比較する。
- dropがrecord-owned pathだけを除去し、隣接user-authored pathを保持する。
- shared fileの単一/複数plugin contributionをrecordし、対象寄与だけを除いて残存寄与を同じbytesへ再構築する。
- shared file user edit、期待post-state不一致、寄与identity不一致を全mutation前にrejectする。
- drop doctor failureで3 surface不変、成功時は宣言成果物だけが消えることを確認する。
- PREPARED直後、host各write後、record write後、audit write前後、COMMITTED前後の全crash/failure境界をfixture化し、次操作前recoveryと二重audit 0を確認する。
- journal/preimage driftとcorruptionで追加mutation 0、新規compose/drop禁止、loud停止を確認する。
- U11のreference内容に依存しない最小fixtureでU10 contractを証明し、U12へitem 20 evidenceだけを渡す。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Review UTC: `2026-07-20T14:26:20Z` (`date -u`)
- Verdict: **NOT-READY**

### Findings

1. **[BLOCKING] dropのownershipがmerge/splice対象を安全に表現できない。** composeは既存hostへ4 seamのentry mergeとdeclared fragment spliceを行う一方、`PluginRecord`とdropは「record-owned path」の除去としている。shared file全体のpathをplugin所有とみなすとuser-authored bytesも削除し、pathを所有しないとmerge entry/fragmentをdropできない。recordが「新規copy path」と「shared file内のplugin寄与（seam entry/fragment）」を別々に識別し、dropが後者だけを逆操作する所有権契約が必要である。これはE-OC1の未決ownership意味論に該当するため、無承認で具体化せず再付議が必要である。
2. **[BLOCKING] host・composition record・auditの3 surface atomicityが宣言だけで、commit途中失敗時の不変性を証明できない。** temp treeはcopy/merge/splice/compile/sensor/doctor失敗のcanonical host汚染は防げるが、成功後にhost、record、auditを別々に書くなら、2つ目以降の失敗で部分commitが生じる。single atomic renameの対象範囲、commit marker/recovery、audit-first等の方式と、各failure pointのpre/post bytes契約が未確定である。E-OC1の未決atomicity/failure policyとして再付議が必要である。
3. **[MAJOR] 3成果物は共通の前提を持つが、上記2点の不完全な意味論も共有している。** `business-rules.md` BR-U10-08/10/11、`domain-entities.md` の`PluginRecord`/`WorkspaceTransaction`、本artifactのAtomic compose/dropを、再裁定後に同じownership単位・commit protocol・failure matrixへ同時に更新する必要がある。

### Conformance assessment

- E-OC1裁定A: 6 public seam、内部helper `discoverPlugins`、`component-methods.md`と一致するsignature、未承認の新規public APIなしは確認できる。
- Inspect: same-name stage、malformed manifest、unknown seam、clobberの全error収集と`ready | rejected`、error時write 0は明記されている。
- Compose: no-clobber、4 seam（`produces` / `consumes` / `sensors` / `required_sections`）、declared fragment、temp C1/C2 compile + sensor後commitは明記される。ただしcommitの3 surface atomicityは不十分である。
- Drop: record外pathを推測削除せずtemp compile + doctor後commitは明記される。ただしshared-file contributionの所有権が欠ける。
- Failure: host/record/audit不変の目標は一貫するが、commit失敗を含む実現可能な原子性契約が欠ける。
- Unit境界: U11のreference plugin/guide、U12のevidence/ledger集約をU10から除外しており、境界は整合する。
- 6 consumes実質利用: 3成果物すべてに入力別traceabilityがあり、public seam/Unit境界、item 20 mapping、FR/NFR、C4/C1/C2責務、正準signature、invocation-local transactionに実質反映されている。

### Sensor evaluation

- `required-sections`: **PASS** — 3必須成果物はそれぞれH2を2つ以上持つ。
- `upstream-coverage`: **PASS** — 3成果物は6 consumesを明示し、入力ごとの実質利用を記録している。
- `answer-evidence`: **PASS** — Q&AにE-OC1裁定A、UTC、`[Answer]`、ambiguity analysisがある。
- `linter`: **N/A** — 対象はMarkdown成果物のみで、`.ts` / `.js` 出力はない。
- `type-check`: **N/A** — 対象はMarkdown成果物のみで、`.ts` / `.tsx` 出力はない。

READY条件は、E-OC1へownershipと3 surface atomic commit/failure意味論を再付議し、裁定結果を3成果物の同一のrecord・drop・transaction契約に反映することである。

## Review — Iteration 2

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Review UTC: `2026-07-20T14:33:55Z` (`date -u`)
- Verdict: **READY**

### Iteration 1 findingの再評価

1. **[RESOLVED] shared-file contribution ownership/drop。** E-USSU10FD1はchoice 1（3–0）を採用し、GoA留保2件はともに反映済みである。3成果物は、shared file全体のownershipを禁止し、base/precondition、plugin自身のcanonical contribution、決定的適用順、期待post-stateを`PluginRecord`へ保持する同一契約を採る。dropは全current一致をmutation前に検証し、対象寄与を除いた残存寄与を決定的に再構築する。user edit、unknown drift、contribution identity不一致はhost/record/audit三面不変でloud rejectする。単一・複数plugin、user edit、post-state不一致、identity不一致のfixtureも明記され、前回blocking findingは解消した。
2. **[RESOLVED] host/record/auditのcommit途中・crash atomicity。** E-USSU10FD2はchoice 1（3–0）を採用し、GoA留保2件はともに反映済みである。3成果物は、workspace lock下でtransaction id、phase、三面の全write-set/preimageを持つdurable journalを最初のcanonical mutation前に`PREPARED`化し、三面完了後だけ`COMMITTED`へ進める同一契約を採る。handled failureはreturn前に即時・冪等復元し、crashは次操作前に同じlock下でpre-stateへ回復する。未回復中の新規操作禁止とdrift/corruption時の追加mutationなしloud停止も明記され、前回blocking findingは解消した。
3. **[RESOLVED] 3成果物間の意味論整合。** `domain-entities.md`の`PluginRecord`/`WorkspaceTransaction`、`business-rules.md`のBR-U10-16〜22、本artifactのshared ownership・atomic compose/drop・failure tableは、同じownership単位、journal phase、failure/recovery契約を使用している。

### Conformance assessment

- Public/internal seam: publicは`inspectPlugin`、`planPluginComposition`、`applyPluginPlan`、`planPluginDrop`、`applyPluginDrop`、`diagnosePlugins`の6関数だけで、`discoverPlugins`はC4内部helperとして区別される。
- 正準signature: 本artifactの6 public signatureと内部`discoverPlugins` signatureは`component-methods.md`のC4定義へ完全一致し、新規public APIやfailure variantを追加していない。
- 6 consumes実質利用: 3成果物はいずれも、`unit-of-work.md`のU10 seam/境界、`unit-of-work-story-map.md`のitem 20 owner関係、`requirements.md`のFR-6/NFR-1/2、`components.md`のC4/C1/C2責務、`component-methods.md`のunion/signature、`services.md`のinvocation-local atomic workflowを設計判断へ実質反映している。
- GoA留保: E-USSU10FD1の2件とE-USSU10FD2の2件を全数確認し、ownership、precondition/post-state、残存寄与再構築、三面不変、全write-set/preimage、PREPARED/COMMITTED、lock、冪等回復、新規操作禁止、drift/corruption停止の各条件が欠落なく反映されている。
- Crash/failure fixture: PREPARED直後、host各write後、record write後、audit write前後、COMMITTED前後を列挙し、次操作前recovery、二重audit 0、journal/preimage drift/corruption時の追加mutation 0を検証するため、裁定が要求するcrash-point全境界を覆う。
- Unit境界: U01 schema、U02/C2 compile、U09 projectionを再利用し、U11 reference/guideとU12 evidence/ledger closureを所有しない。deferred plugin面も追加していない。

### New findings

- 新規findingなし。

### Sensor evaluation

- `required-sections`: **PASS** — 3必須成果物はそれぞれH2を2つ以上持つ。
- `upstream-coverage`: **PASS** — 3成果物は6 consumesを明示し、入力ごとの実質利用を記録している。
- `answer-evidence`: **PASS** — Q1/Q2は`[Answer]`、3–0裁定、GoA結果、UTC通知、許可されたE-USSU10FD1/2 recordへの根拠参照を持ち、ambiguity analysisも完了している。
- `linter`: **N/A** — 対象はMarkdown成果物のみで、`.ts` / `.js`出力はない。
- `type-check`: **N/A** — 対象はMarkdown成果物のみで、`.ts` / `.tsx`出力はない。

Iteration 1のblocking finding 2件と連動するmajor findingはすべて解消され、追加blocking findingはないため、U10 plugin-composition functional designを**READY**と判定する。
