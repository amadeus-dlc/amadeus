# Performance Design: solo-gate-transaction

## Inputs and Budget

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`に基づく。process invocation、parse、ritual再実行を最小化する。

## Execution Design

- directive carrier validationは2 fieldを各1回parseし、auditへ触れない。
- grant-backed reportはstate processを1回spawnし、exit/stderr bytes/stdout単一JSONを1回だけ分類する。
- `approved`または`await-approval` exact objectへ一度だけdecodeし、unknown keysを拒否する。
- expected fallbackではstage body、unit body、reviewer、sensor、learningsの既存成果を再利用し、invocation増分0とする。
- targeted human continuationはstate process 1回だけで、grant domain scanを再実行しない。
- grant-backed transactionはspace-wide receipt lookup passとowner-lock内fresh validation passを各1回実行する。前者のsnapshotをgrant projectionへ再利用しない。

## Counter Seams

subprocess adapterへtest observerを注入し、`stateSpawned`、`stdoutParsed`、`stderrBytes`、`receiptEntriesVisited`、`ownerEntriesVisited`、各quality ritual invocationを数える。U=`1/3/10`とsuccess/fallback/protocol/fatal matrixで上限をassertする。receipt lookupの上限だけをspace-wide規模Eで評価し、owner validationはowner ledger規模E_ownerで別評価する。

## Resource Strategy

new process pool、cache、queue、daemonを追加しない。reservationはsession当たり最大1件、atomic small JSON file 1件とし、prompt bodyを保存しない。

## Verification

U2-PERF-01–06をdirective parser、report adapter、approval integration、fallback invocation、per-unit、targeted continuation suiteへ割り当てる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:38:51Z
- **Iteration:** 1
- **Scope decision:** none

exclusive authority union、strict wire、opaque UUIDv7 target、owner HUMAN_TURN mint、per-unit成果物再利用、component ownerは概ね具体化されている。しかしreservation consume境界のcrash recovery、fresh owner validationとsnapshot再利用の両立、branch別lock契約、stateへのsession identity伝播が閉じていない。

### Findings

- BLOCKER: owner approval完了後からreservationのconsumed更新前までのcrash/replay契約がない。markerがmintedのまま残ると、再reportではopen gate検証が失敗する一方、同一sessionの2件目armもfail-closedになるため、そのsessionのfallback continuationが恒久的に停止し得る。approval/stateが既に完了していることをminted provenanceとtarget/stageから識別して冪等にconsumeする回復遷移、または同等の収束契約と当該step-boundary failure fixtureが必要である。
- BLOCKER: U1 snapshot再利用条件とfresh grant検証が両立しない。performance-requirementsはworkspace outer lock内で取得したspace-wide snapshotをowner validationへ再利用し再読を増やさない一方、reliability-designはreceipt owner pin後にowner lock内のfresh auditで再検証する。space scanからowner lock取得までにrevokeがappendできるため、旧snapshot再利用は取消を見落とす。owner lock取得後のowner再読を許可して性能counterの範囲をreceipt lookupへ限定するか、owner snapshotをlock保持下で取得する具体algorithmへ統一する必要がある。
- MAJOR: branch別lock契約がFunctional Design内で矛盾する。入力分類節はworkspace→owner lockをfull grant pairだけに限定し、targeted humanはowner lockだけ、通常human/teamは既存lockingとする一方、Approval Transaction Under Lockのstep 1–3は先にworkspace lockとreceipt owner lockを取得してからcarrierなしなら既存human/team authorizationを実行すると規定する。carrierなしではreceipt ownerも決定できない。NFR Designのexclusive branch表に合わせ、各branchの独立したtransaction entrypointをFunctional Designでも一意にする必要がある。
- MAJOR: targeted state processが同じhost sessionのminted reservationを選ぶためのsession identity伝播契約が不足している。公開flagは--target-intent-idだけで、session IDをuser flagから受けない方針だが、state subprocessがどのtrusted environment/runtime keyからnormalized session digestを取得し、target UUID・stage・reservationをexact matchするかがcomponent interfaceに現れていない。このままではtarget UUIDだけで別session reservationを探索・選択する実装余地がある。
- CONFIRMED: authorization inputはnormal human/team、grant-backed solo、targeted human、invalidのexclusive unionとしてlock取得前に分類され、human＋carrier、partial pair、target単独、team/invalid mode carrierはmutation前に拒否される。
- CONFIRMED: state wireはexit、stderr bytes、単一JSON、exact keysをすべて検証し、protocol/fatal/fallbackを相互変換しない。
- CONFIRMED: targetはcurrent-space registryのexactly-one in-flight UUIDv7へ解決され、path・alias・別space・active cursorを信頼せず、reservation自体を認可証拠にしない。
- CONFIRMED: fallbackおよびtargeted continuationではbody、per-unit body、reviewer、sensor、learningsの再実行増分0がcounterとartifact hashで検証可能であり、componentには単一owner pathが割り当てられている。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:46:41Z
- **Iteration:** 2
- **Scope decision:** none

approval後consume前crash、owner-lock内fresh read、branch別entrypointは実装可能な契約へ修正された。しかしtrusted session identityのinternal伝播は、Reservation Idの取得元・turn間ライフサイクル・具体的transport・実装ownerが未確定で、cross-session防止を機械的に実装できない。

### Findings

- BLOCKER: targeted continuationへ渡すinternal session contextを構築できる具体契約がない。fallbackでReservation Idを生成した後、次のhuman promptは別turnであり、trusted hook envelopeから得られると明記された値はsession IDだけである。それにもかかわらずstateはinternal digest＋Reservation Id＋target UUID＋stageのexact matchを要求する。native adapterが後続turnでどのようにReservation Idを取得し、hookからconductor、orchestrator、state subprocessへどの非公開channelで渡すかが未定義である。同一conductor invocationという記述もfallbackから次のhuman replyまでのturn境界と整合しない。session digestからsession-local単一reservationをexact lookupしてReservation Idを内部carrierへ載せる責務、carrierの具体型・transport・寿命・欠落時outcomeを定義する必要がある。
- MAJOR: Trusted Session Context AdapterのSingle owner pathがharness native adapterとなっており、literal実装pathではない。複数harnessのどのcanonical adapterがhook envelopeを受け、internal contextを生成・注入するかを開発者が決定できない。前項のtransport APIと併せ、少なくとも本harnessの単一owner pathと生成側・消費側interfaceを指定する必要がある。
- RESOLVED: owner approval後・consume前crashはReservation IdとHUMAN_TURN座標に相関するapproval/completion/state prefixをexact lookupし、既存recovery完了後にmarkerだけを冪等consumeする。approval、completion、state advance、consume直前のfailure fixtureも定義された。
- RESOLVED: space-wide snapshotはreceipt owner pin専用となり、owner lock取得後にowner auditをfresh readする。receipt passとowner validation passのcounterも分離され、scan後のrevokeを観測するbarrier fixtureがある。
- RESOLVED: grant-backed、targeted human、normal human/teamは独立entrypointとなり、workspace→owner、owner-only、既存lockingの境界が一意になった。
- CONFIRMED: strict wire、exclusive authority union、opaque UUIDv7 target、typed fallback差分0、per-unit成果物のno-rerun、team/human非回帰は維持されている。
