# Components: Solo Standing Grant

## Design Inputs

本設計は`requirements.md`、brownfieldの`architecture.md`と`component-inventory.md`、実装姿勢を定める`team-practices.md`を入力とする。新しい外部service、永続設定、database、UI componentは追加しない。

## Domain Model

| Concept | Kind | Identity / value | Invariant |
|---|---|---|---|
| Gate Requirement | policy value | stage slugとworkflow stateから導出 | gateの有無だけを表し、認可源を含めない |
| Standing Grant | audit-derived entity | `Grant Id` | `GRANT_ISSUED`と`GRANT_REVOKED`から導出し、設定へ保存しない |
| Standing Grant Authorization | route-selected value | `standing_grant_id` + `standing_grant_route_id` | solo modeの対象gateだけに存在し、routeからcommitまで同じ組を運ぶ |
| Grant Route Receipt | protected audit fact | `Route Id` | stageとGrant Idをroute試行へ相関し、commit時のcarrier差替えを拒否する |
| Approval Authorization | commit decision | human presence、team delegation、またはsolo grant | approveだけを認可し、reject等へ流用しない |
| Approval Outcome | discriminated union | `approved` / `await-approval` | expected grant invalidationはerrorではなくhuman gate待機へ戻す |

`Standing Grant`は既存fieldに加え、solo候補の完全順序に使う発行監査時刻をread modelとして保持する。これは新しい監査fieldではなく、既存`GRANT_ISSUED.Timestamp`のparse結果である。

## Component Boundaries

### C1. Standing Grant Ledger Domain

- **Owner:** `packages/framework/core/tools/amadeus-lib.ts`
- **Owns:** audit event parse、revocation集合、provenance、expiry、intent binding、gate coverage、solo候補選択、space全intentのRoute Id exact receipt所有者解決、exact-ID再検証
- **Does not own:** directive emission、CLI prompt、state mutation、audit mutation
- **Public surface:** read-onlyのqueryと判別可能なvalidation result

### C2. Directive Contract

- **Owner:** `packages/framework/core/tools/amadeus-directive.ts`
- **Owns:** `run-stage.standing_grant_id?: string`と`standing_grant_route_id?: string`のall-or-none pair、汎用`await-approval` directive、strict unknown-key/type validation
- **Does not own:** grant探索や認可判断
- **Compatibility:** `standing_grant_id`はsoloで候補選択時だけ存在する。team modeの既存directive JSONは不変

### C3. Gate Router and Report Transport

- **Owner:** `packages/framework/core/tools/amadeus-orchestrate.ts`
- **Owns:** gate requirement確定後のsolo grant選択、workspace outer lock内のprotected route receipt記録、Grant Idのdirective付与、report flag transport、state outcomeからdirectiveへの変換
- **Does not own:** commit可否の最終判断、state/audit mutation
- **Rule:** canonical operating modeが明示的soloで、`gate === true`かつ対象内の場合だけcarrier pairを付ける

### C4. Approval Transaction

- **Owner:** `packages/framework/core/tools/amadeus-state.ts`
- **Owns:** grant発行・取消verb、receipt所有intentへpinされたapproval lock、exact-ID再検証、approval audit、state advance
- **Does not own:** route時の候補選択、human prompt
- **Atomic boundary:** 既存workspace-level intent registry lockをouterとしてspace-wide exactly-one判定からtransaction完了まで保持し、receipt所有intentの既存audit/state lockをinnerとしてexact-ID再検証から`GATE_APPROVED`、`STAGE_COMPLETED`、state write、advanceまで保持する。取得順はworkspace → owner intentに固定する

### C5. Harness Conductors

- **Owner:** canonical core skill/protocolから6 harnessへ生成されるconductor手順
- **Owns:** Grant Id / Route Id pairのverbatim forwarding、`await-approval`受領時の既存human gate提示
- **Does not own:** grant eligibilityの再導出、stderr解釈
- **Compatibility:** Claude、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCodeで同じ意味論

## Policy Ownership

| Policy | Single owner | Consumers |
|---|---|---|
| gate existence、phase boundary、effective walking-skeleton stance | existing shared gate classifier | router、grant eligibility adapter |
| per-unit all-covered final gate | existing per-unit router | solo selector（`gate === true`だけを見る） |
| solo grant total order | Standing Grant Ledger Domain | Gate Routerのみ |
| route/commit identity receipt | protected audit event | Gate Routerが発行、Approval Transactionが検証 |
| exact-ID validity at commit | Standing Grant Ledger Domain | Approval Transactionのみ |

Grant Domainはgateを再分類しない。既存classifierの結果と共有helperを入力としてauthorization eligibilityだけを判定する。`amadeus-feature`などproject scope overrideは、対応するgreenfield-shaped canonical scopeと同じ実効walking-skeleton分類へ解決する。

## Operating Mode Contract

単一resolverをcoreで共有する。

| Raw `AMADEUS_OPERATING_MODE` | Resolved mode |
|---|---|
| 未設定または空 | `solo` |
| `solo` | `solo` |
| `team` | `team` |
| その他 | invalidとしてfail-closed |

発行、取消、route、commitは同じresolverを使う。teamは既存経路、soloだけが新carrier経路へ入る。

## Excluded Components

- standing-grant専用service class
- authorization databaseまたはstate field
- team leader/delegation adapterのsolo利用
- grant専用のgate enum値
- AWS resource、network service、UI

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T05:54:08Z
- **Iteration:** 1
- **Scope decision:** none

gate/authorization分離と3境界は概ね妥当だが、typed fallbackのCLI wire契約、route receiptの試行相関・消費規則、canonical mode解決、policy ownerが未確定である。

### Findings

- BLOCKER: grant-backed approveのstdout JSON shape、exit code、stderr、malformed/unknown outcome、report変換ownerを厳格に定義する必要がある。
- MAJOR: GATE_AUTHORIZATION_SELECTEDにstage実行試行の相関identityがなく、重複next、再entry、crash、並行sessionで正当なcommitが不必要にfallbackし得る。
- MAJOR: receiptの消費済み判定についてintent/shard/stage/route試行/event orderingが曖昧である。
- MAJOR: AMADEUS_OPERATING_MODE !== teamは未知値をsolo扱いするため、route/commitで同じcanonical resolverと未知値拒否規則が必要。
- MINOR: gate classifierとgrant domainのpolicy ownership記述を統一する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T05:59:00Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5指摘はすべて解消され、Grant Id/Route Id相関、lock内exact lookup、typed fallback、mode isolation、gate policy所有境界が実装可能な契約として閉じた。

### Findings

- CLI wireはgrant-backed approve限定でexit 0、stderr空、stdout厳密1行JSON、strict schema、report parser ownerを定義した。
- UUID v4 Route IdとGrant Idのall-or-none pairをprotected receipt記録後にemitし、stateまでverbatim forwardingする。
- space内の全intent・全shardからRoute Id exact lookupし、exactly oneのreceipt所有intentへtransactionをpinする。0/複数/stage/Grant Id不一致をfail-closedにし、latest/consumed推論を廃止した。
- canonical operating mode resolverを発行・取消・route・commitで共有し、未知値を拒否する。
- gate existence/policyは既存classifier/router、Grant Domainはauthorization eligibilityだけを所有する。
- fallback、team mode、walking skeleton、phase boundary、per-unit、全6 harness契約に追加阻害事項はない。
