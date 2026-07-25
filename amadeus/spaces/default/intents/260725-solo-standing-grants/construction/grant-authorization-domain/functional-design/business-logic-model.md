# Business Logic Model: grant-authorization-domain

## Design Inputs

本設計は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を入力とする。対象はaudit-derived standing grant domainであり、UIや外部serviceを持たない。

## Workflow 1: Operating Mode Resolution

1. `AMADEUS_OPERATING_MODE`相当のraw valueを受け取る。
2. 未設定または空文字は`solo`へ正規化する。
3. `solo`と`team`はそのまま返す。
4. その他の値はdomain candidate探索前にfatal invalid-modeとする。

発行、取消、route、commitは同じresolverを使用し、境界ごとのmode解釈差を禁止する。

## Workflow 2: Grant Issue and Revoke Projection

### Issue

1. fresh `HUMAN_TURN` provenanceを検証する。
2. scopeが省略または`stage-gates`であることを検証する。
3. TTLをNumberへ変換し、省略時14,400,000ms、明示時finiteかつ`> 0`を検証する。
4. active intent、issuer、issued time、expiry、flagsを持つ`GRANT_ISSUED`を1件appendする。
5. eventからGrant Idを返す。

### Revoke

1. fresh `HUMAN_TURN` provenanceを検証する。
2. Grant Idが8桁小文字hexであることだけを検証する。
3. grantの存在、intent一致、過去取消の有無を探索せず、指定IDの`GRANT_REVOKED`を1件appendする。

### Projection

全audit shardを読み、valid `GRANT_ISSUED`をGrant Id別に解釈する。`GRANT_REVOKED`が1件以上あるIDは取消済みとする。不正eventは候補にせず、承認に必要なprovenanceが曖昧ならfail-closedにする。

## Workflow 3: Solo Candidate Selection

入力はactive intent、stage、gate context、current time、audit eventsである。

1. canonical modeが`solo`であることを要求する。`team`では既存team finderへ制御を残す。
2. valid issue provenance、active-intent binding、未取消、`expiry > now`を満たすgrantだけを残す。
3. 同じGrant Idを持つvalid issue eventがexactly oneの候補だけを残す。0件は候補にならず、複数件はambiguousとして候補から除外する。
4. gate eligibility predicateを適用し、phase-boundary、walking-skeleton、stage coverageの対象外を除く。
5. expiry descendingで比較する。
6. 同一expiryなら`GRANT_ISSUED.Timestamp` descendingで比較する。
7. さらに同値ならGrant Id lexicographic ascendingで比較する。
8. 先頭1件またはcandidateなしを返す。

## Workflow 4: Gate Eligibility

1. gate requirementは既存classifierのboolean結果を入力として受け、変更しない。
2. `gate === false`ならauthorization探索を行わない。
3. phase-boundaryならgrantの`includesPhaseBoundary`がtrueの場合だけ次へ進む。この判定をwalking-skeletonより先に適用する。
4. walking-skeleton stanceが`on`なら最初のConstruction gateをhuman-onlyにする。
5. stanceが`off`なら最初のConstruction gateも通常gateとして評価する。
6. stanceがscope-dependentまたは未記録ならshared scope classifierを使い、effective-onならhuman-only、effective-offなら通常gateとして評価する。`amadeus-feature`はgreenfield-shapedなのでeffective-onである。
7. scope-dependentの実効値を解決できない場合はfail-closedでhuman-onlyにする。
8. grant scopeが対象stage gateをcoverする場合だけeligibleを返す。

結果は`eligible`または理由付き`ineligible`であり、擬似gate値を返さない。

## Workflow 5: Authorization Selection Receipt

routeでcandidateを選択した後、carrierを返す前にUUID v4 Route Idを生成する。既存workspace-level intent registry lockを取得し、space全体で同じRoute Idのreceiptが0件であることを確認してから、protected `GATE_AUTHORIZATION_SELECTED`をaudit-firstでappendする。eventはRoute Id、Stage、Grant Idを持つ。UUID衝突またはlookup I/O failureはcarrier emit前のfatal errorとし、duplicate receiptをappendしない。

commit lookupはspace配下の全intent・全audit shardからRoute Id完全一致を探索し、exactly oneのreceiptを所有するintentをtransaction targetへpinする。現在のactive-intent cursorはtarget決定に使用しない。

- 0件: `no-longer-authorizes`
- 2件以上: `no-longer-authorizes`
- 1件でStage不一致: `no-longer-authorizes`
- 1件でGrant Id不一致: substitution attemptをfail-closedにして`no-longer-authorizes`
- 1件で全field一致: receipt所有intentだけを対象にexact grant revalidationへ進む

active-intent cursorが別intentへ移動していても、そのintentではapproval、fallback、audit、state mutationを一切行わない。

receiptはimmutable factであり、後続routeによってsupersedeまたはconsumeされない。

## Workflow 6: Exact Grant Revalidation

commitは既存workspace-level intent registry lockをouter lockとして取得してからspace-wide receipt lookupを行い、receipt所有intentの既存audit/state lockをinner lockとして取得する。lock順序は常にworkspace → owner intentとし、逆順を禁止する。outer lockはexactly-one判定からtransaction完了まで保持するため、別intentへの同一Route Id receipt追加を割り込ませない。

inner lock内でmutation前に、receiptが指す同じGrant Idを再解決する。指定IDに一致するvalid `GRANT_ISSUED`のcardinality、expiry、revocation、receipt owner intentとのbinding、issuer provenance、gate eligibilityを現在値で再評価する。`GRANT_REVOKED` appendも同じowner intent lockを取得するため、再検証から`GATE_APPROVED`までの間へ取消を割り込ませない。

- valid: verified Grant Idをapproval transactionへ返す。
- issue eventが0件または複数件: `no-longer-authorizes`を返す。
- expired/revoked/out-of-scope/intent mismatch/provenance invalid: `no-longer-authorizes`を返す。
- receipt欠落/重複/field不一致: `no-longer-authorizes`を返す。
- audit I/O failure、state不整合、wire parse failure: fatal errorを返す。

新しい高優先grantが追加されても再探索・差替えを行わない。

## Deterministic Test Seams

Implementation integration `U1-CODE-DOMAIN-2` is owned by `packages/framework/core/tools/amadeus-grant-authorization.ts`; the Code Generation reviewer may spot-check this registry-bound domain module against the workflows below.

- current timeは引数として渡す。
- audit eventsはfixture配列として渡す。
- shard順は候補の完全比較順に影響しない。
- Route Id generatorはfixtureで固定可能にする。
- 同一Grant Idのissue event 0/1/複数fixtureをcandidate routeとcommit revalidationの双方で固定する。
- 極小正数TTLで`expiresAt === issuedAt`になるfixtureを受理し、route時には`expiry <= now`としてinactiveになることを固定する。
- sleep、filesystem mtime、stderr textを判定に使用しない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:20:14Z
- **Iteration:** 1
- **Scope decision:** none

完全順序、監査由来model、mode resolver、team isolationは明確だが、walking-skeleton行列、receipt outcome、issue cardinality、極小TTL invariantに上位契約との不整合がある。

### Findings

- BLOCKER: walking-skeleton判定が明示offとscope-dependent effective-offでも常にhuman-onlyとしておりFR-21行列を壊す。
- BLOCKER: receipt欠落・重複・field不一致をfatalとするがApplication Designはawait-approvalへ分類する。
- MAJOR: exact Grant Id lookupのGRANT_ISSUED 0/1/複数cardinality規則が脱落している。
- MAJOR: expiresAt > issuedAt invariantは極小正数TTLのIEEE-754丸めと両立しない。
- candidate完全順序、issue/revoke主要契約、team isolation、deterministic seamsは確認済み。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T06:22:02Z
- **Iteration:** 2
- **Scope decision:** none

4指摘は解消され、workflow、rules、entitiesのoutcome分類とinvariantが上位契約へ追跡可能である。

### Findings

- walking-skeleton全stanceとphase-boundary precedenceが明示された。
- receipt不一致はtyped no-longer-authorizes、真正I/O/state/wire failureだけfatalとなった。
- 同一Grant Id issue cardinality 0/1/複数をrouteとcommit双方で定義した。
- 極小正数TTLの丸めをvalid issue factとして保持しactive判定でinactiveにする。
- candidate完全順序、team isolation、FR/NFR coverageを確認した。
