# Performance Requirements: grant-authorization-domain

## Inputs and Scope

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。対象はlocal audit projection、solo candidate selection、space-wide Route Id lookupであり、network latencyは含まない。

## Targets

| ID | Scenario | Target | Verification |
|---|---|---|---|
| U1-PERF-01 | E件のgrant audit projection | event visit回数`<= E`、追加memory item数`<= 2E` | E=`1,000/2,000/4,000/8,000`のoperation counter |
| U1-PERF-02 | space内100 intent、計100,000 audit eventsからRoute Id exact lookup | event visit回数`= E`かつCIで5秒以内 | 固定fixtureのcounter assertion、warm-up後3回の最大値 |
| U1-PERF-03 | candidate完全順序から先頭1件を選択 | comparator call回数`<= G - 1`、追加memory item数`<= G` | G=`1,000/2,000/4,000/8,000/10,000`のone-pass fixture |
| U1-PERF-04 | team mode | solo candidate/space-wide receipt scan回数0、既存team baselineの実行時間を新しいblocking条件にしない | spy/count + existing team golden |

## Resource Constraints

- 新しいcache、index database、daemonを導入しない。
- audit fileを必要回数以上に再読せず、同一transaction内でparse結果を再利用する。
- performance target未達をcorrectness低下やteam finder変更で回避しない。

## Acceptance

blocking correctness testsを先に通し、performance fixtureは安定したsynthetic dataと固定clock/Route Idを使用する。漸近性はwall clock比率ではなくoperation counterでblocking判定し、5秒は100,000 event fixtureの退行上限として併用する。

## Traceability and Verification Ownership

| Target | Upstream | Business rules | Fixture / blocking suite owner |
|---|---|---|---|
| U1-PERF-01 | NFR-06, NFR-07 | BR-09–14a | grant domain unit suite |
| U1-PERF-02 | NFR-02, NFR-07 | BR-22–24 | receipt ownership integration suite |
| U1-PERF-03 | FR-07, NFR-07 | BR-13 | grant domain unit suite |
| U1-PERF-04 | FR-19, NFR-05 | BR-02, BR-14 | existing team regression suite |


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:47:07Z
- **Iteration:** 1
- **Scope decision:** none

監査保護、決定的fixture、既存技術スタック維持の方向は妥当だが、lookup境界、競合時のlock契約、性能測定、team非回帰、上位NFRへの追跡性が実装可能な水準まで閉じていない。

### Findings

- BLOCKER: Route Id lookup境界がFunctional Designと矛盾する — Functional Designはactive intent配下の全shardだけをlookupする一方、NFRは全intentを走査するspace-wide ownership lookupを前提とする。lookup範囲、receipt owner intentの決定方法、0件・複数intent一致のoutcomeを単一契約へ統一すること。
- MAJOR: revokeとapprovalのlock共有契約が測定不能 — GRANT_REVOKED appendが同じserialization lockへ参加し、検証後からGATE_APPROVEDまで割り込めないこと、同時revokeのlock-contention fixtureと許容される二つの直列化結果を定義すること。
- MAJOR: 漸近性能targetに機械的なpass/fail判定がない — operation counter、fixture系列、許容上限式または明確な比率を定義すること。
- MAJOR: team非回帰がfinder結果だけに縮退している — 既存team issuance/revocationのCLI出力、default TTL、監査field・件数、leader/delegation連携をbaseline比較すること。
- MAJOR: NFR targetから上位要件・Functional Ruleへの追跡が不足 — 各targetを上位ID、business rule、fixture、blocking suiteへ対応付けること。
- INFO: 技術スタック判断 — Bun、strict TypeScript ESM、既存append-only audit、filesystem lock、bun:test/fast-check、Biomeを再利用し新規依存を追加しない判断は整合している。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:51:58Z
- **Iteration:** 2
- **Scope decision:** none

共通lock、決定的performance上限、team lifecycle golden、trace tableは解消された。しかしspace-wide receipt ownershipがFunctional Designと未統一であり、per-intent lockでは全space exactly-one判定のTOCTOUを閉じられない。

### Findings

- BLOCKER: space-wide owner lookupがFunctional Designと依然矛盾する。business-logic-model.mdはactive intent配下だけをlookupすると規定する一方、NFR成果物は全intentを走査してreceipt ownerをtransaction targetにする。Functional Designと単一契約へ統一する必要がある。
- BLOCKER: space-wide exactly-one判定とowner-intent lockの間にTOCTOUが残る。protected receipt append、space-wide owner lookup、commit revalidationを同じspace-level直列化境界へ置くか、同等にduplicate追加を防ぐ機械契約が必要である。
- RESOLVED: revoke appendとapprovalはreceipt owner intentの同じlockを共有し、barrier fixtureで2直列化結果だけを許容する。
- RESOLVED: performance targetは決定的上限とfixture系列を持つ。
- RESOLVED: team lifecycle/delegationをblocking goldenへ追加した。
- RESOLVED: targetとupstream/BR/suite ownerのtraceを追加した。
- CONFIRMED: 既存技術スタック維持と新規runtime dependencyなしは妥当。
