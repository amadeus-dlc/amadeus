# Requirements: Solo Standing Grant

## Intent Analysis

目的は、solo mode の人間が明示的に発行した期限付き standing grant を、通常 stage gate の正当な認可根拠として利用できるようにすることである。`HUMAN_TURN` の要件や gate policy を弱めるのではなく、gate の存在と認可源を分離し、有効な grant を追加の認可源として扱う。

要求の一次根拠は `intent-statement.md` と `scope-document.md` である。brownfield の現行経路は `business-overview.md`、`architecture.md`、`code-structure.md` により確認し、実装・検証の姿勢は `team-practices.md` に従う。Standing grant は新しい設定モデルではなく、引き続き監査イベントから導出する。

## Functional Requirements

### Grant Lifecycle

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-01 | Must | solo mode で fresh `HUMAN_TURN` を根拠に standing grant を発行できる | Given solo mode とfresh human turn、When発行verbを1回実行、Then `GRANT_ISSUED`が正確に1件記録される。fresh turnなし、unsupported scope、TTL不正では0件となりfatal CLI refusalになる |
| FR-02 | Must | solo grant は発行時の active intent に一意にbindingされる | Given intent Aで発行したgrant、When intent Bのgateをroute、Then grantは候補にならずhuman gateになる |
| FR-03 | Must | solo mode でstanding grantをGrant Id指定で取消でき、現行verbの入力・監査契約を維持する | fresh human turnと8桁小文字hex IDがあれば、存在しないID、別intent発行ID、取消済みIDでも呼出し1回につき`GRANT_REVOKED`を1件記録する。missing/malformed IDまたはfresh turnなしでは0件でfatal CLI refusalとなる |
| FR-04 | Must | 現行のdefault TTL 4時間と明示TTL契約を維持する | `--ttl-ms`省略時は14,400,000ms。明示値はNumber変換後にfiniteかつ`> 0`なら小数・上限なしで受理し、0、負数、NaN、Infinityは発行前に拒否する。expiryは発行clockとTTLの和である |
| FR-05 | Must | malformed、期限切れ、取消済み、issuer provenance不正のgrantを候補から除外する | 各不正fixtureでrouteしたときgrant-backed authorizationが選択されない |

### Gate Requirement and Authorization

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-06 | Must | gate requirement と authorization source を別の契約として表現する | Given通常gate、When有効grantがある場合とない場合、Then gateの有無は同一で、認可源だけが変化する |
| FR-07 | Must | solo mode の通常stage gateで対象をcoverする有効grantをroute時に1件選択する | solo候補は失効時刻降順、同値なら`GRANT_ISSUED`監査時刻降順、さらに同値ならGrant Id辞書順昇順で1件へ決定する。同一expiry・同一監査時刻fixtureを含める。この完全順序をteam modeの既存探索へ適用しない |
| FR-08 | Must | route時に選択した正確なGrant Idをtyped directive carrierで明示する | Given grant-backed route、Then directive validation後も同じGrant Idが保持され、未知fieldや不正shapeはfail-closedになる |
| FR-09 | Must | grant候補がある場合もstage body、reviewer、sensor、§13 learningsを通常どおり完了する | Given grant-backed route、Whenstageを実行、Thenapproval prompt以外のstage ritualが省略されない |
| FR-10 | Must | grant-backed routeでは個別のapproval `HUMAN_TURN`を要求せずcommitを試行する | Given全quality step完了とroute-selected grant、Whenconductorがreport、Thenhuman approval promptなしで同じGrant Idをcommitへ渡す |
| FR-11 | Must | standing grantはapproveだけを認可し、reject、Request Changes、halt-and-askを認可しない | 各非approve操作でgrantを提示しても通常のhuman controlが必要になる |

### Commit Revalidation and Fallback

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-12 | Must | approval commitはrouteで選択された同一Grant Idをlock内かつmutation前に再検証する | Given route-selected grant Aと新しいgrant B、Whencommit、ThenAだけを検証しBへ差し替えない |
| FR-13 | Must | commit時にexpiry、revocation、intent mismatch、gate scope mismatch、provenance不正を再評価する | 各race fixtureでcommitしたときapproval mutationを行わずfallbackする |
| FR-14 | Must | commit再検証成功時の`GATE_APPROVED`に検証済みの正確な`Grant Id`を記録する | auditで`GATE_APPROVED`が1件、`Grant Id`がroute/commitのIDと完全一致する |
| FR-15 | Must | commit再検証失敗を通常のhuman gateへtyped non-error outcomeでfallbackする | Given route後のgrant失効等、Whenreport、Thenerror directiveではなくhuman approvalを提示するdirectiveが返る |
| FR-16 | Must | fallback時にstage成果物とgate待機状態を保持する | Thenstage body/reviewer/learningsを再実行せず、同じgateへhuman replyだけを受け付ける |
| FR-17 | Must | fallback時にapproval/completion/error auditとstate advanceを行わない | Before/after比較で`GATE_APPROVED`、`STAGE_COMPLETED`、`ERROR_LOGGED`の増分が0、current stageが不変になる |
| FR-18 | Must | fallback後のfresh human approvalは既存`HUMAN_TURN`経路で正常にcommitできる | Given fallback後のhuman reply、Whenreport、Then通常の`GATE_APPROVED`/`STAGE_COMPLETED`順序で1回だけ完了する |

### Existing Policy Preservation

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-19 | Must | team modeのleader、delegation、`DELEGATED_APPROVAL`、standing-grant approval経路を変更しない | 現行team fixtureのdirective/state/audit結果が変更前と同一になる |
| FR-20 | Must | phase-boundary gateは現行`includesPhaseBoundary`規則を維持する | flagなしはhuman gate、flagありかつ他条件有効な場合だけ既存規則どおりcoverする |
| FR-21 | Must | 現行の実効walking-skeleton規則で最初のConstruction gateをgrant対象外にする | 下記適用行列のhuman-only全行をfixture化し、greenfield-shaped `amadeus-feature`は既存コード変更でもhuman gateになる。実効offの場合だけ通常gateとして他のgrant条件を評価する |
| FR-22 | Must | per-unit Constructionは全unit完了後の最終stage gateだけをgrant候補にする | 未完unit directiveは従来どおりbodyを実行し、all-covered後だけauthorization carrierを持てる |
| FR-23 | Must | per-unit最終gateのgrant失効fallbackでstage bodyやreviewerを再実行しない | invocation/count fixtureでfallback前後のbody/reviewer回数が不変になる |

### Harness and Documentation Contract

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-24 | Must | canonical coreから全6 harnessへ同一意味論を投影する | Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeのdist driftが0で、directive契約が同じになる |
| FR-25 | Must | conductor手順にgrant-backed auto-commitとtyped human fallbackを明記する | 各harness skillの生成物が同一のroute→report→fallback意味論を記述する |
| FR-26 | Should | help、doctor、state-machine referenceを公開契約変更に必要な範囲だけ更新する | user-facing verb/field/eventが実装と文書で一致し、不要な新設定を記載しない |

### Grant Lifecycle Contract Matrix

| Operation | Input / precondition | Required result | Audit delta |
|---|---|---|---:|
| issue | solo、fresh human turn、scope省略または`stage-gates`、TTL省略 | 4時間後に失効するgrantを発行 | `GRANT_ISSUED` +1 |
| issue | solo、fresh human turn、finiteかつ正の`--ttl-ms` | 指定ms後に失効するgrantを発行 | `GRANT_ISSUED` +1 |
| issue | fresh turnなし、scope対象外、TTLが0・負数・NaN・Infinity | mutation前にfatal CLI refusal | 0 |
| revoke | solo、fresh human turn、8桁小文字hex ID | IDの存在・発行intent・取消履歴を問わず取消意思を追記 | `GRANT_REVOKED` +1 |
| revoke | ID欠落・形式不正、fresh turnなし | mutation前にfatal CLI refusal | 0 |
| repeated call | 同じ有効入力を2回明示実行 | command invocationごとの意思を保持 | 対応event +2 |

取消は監査eventの追記であり、存在検査を伴う更新commandではない。したがってunknown、cross-intent、already-revoked IDも現在のteam verbと同様に追記を受理する。ただしsolo gate側はFR-02によりactive intentにbindingされた発行eventだけを候補にする。

### Walking-Skeleton Authorization Matrix

| Recorded stance | Scope classification | Target gate | Standing grant result |
|---|---|---|---|
| `on` | 任意 | 最初のin-scope Construction gate | human-only |
| `on` | 任意 | 2番目以降の通常gate | 他のgrant条件を評価 |
| `off` | 任意 | 最初のConstruction gate | 他のgrant条件を評価 |
| `scope-dependent`または未記録 | greenfield-shaped（`amadeus-feature`を含む、実効on） | 最初のConstruction gate | human-only |
| `scope-dependent`または未記録 | 実効offのscope | 最初のConstruction gate | 他のgrant条件を評価 |
| 任意 | 任意 | phase boundary | FR-20のphase-boundary opt-inを先に適用 |

route時点でscope-dependentの実効値を解決できない場合はfail-closedでhuman-onlyとする。fixtureは明示`on`、明示`off`、`amadeus-feature`のscope-dependent、実効off scope、stance未記録、phase-boundaryとの重複を含む。

## Non-Functional Requirements

| ID | Attribute | Requirement | Pass/fail target |
|---|---|---|---|
| NFR-01 | Audit integrity | audit-first atomicityとprotected-event mint guardを維持する | approval成功は所定順序、fallbackは対象3event増分0 |
| NFR-02 | Race safety | route/commit TOCTOUを決定的なclock・revocation seamで検証する | sleep依存なしでexpiry/revoke/差替えraceが再現可能 |
| NFR-03 | Security | Grant Id substitution、cross-intent use、forged provenanceをfail-closedにする | 全attack fixtureで自動approval 0件 |
| NFR-04 | Reliability | 想定内fallbackと真正の実行errorをtyped contractで区別する | fallbackはexit/error auditに依存せず、真正errorは既存error経路を維持 |
| NFR-05 | Compatibility | team modeとhuman approvalの外部観測契約を回帰させない | 既存関連suite 100% pass、golden/audit field差分なし |
| NFR-06 | Maintainability | gate policy、grant eligibility、route carrier、commit authorizationの責務を混在させない | Application Designの所有境界と実装fileが1対1に追跡可能 |
| NFR-07 | Testability | directive、state、audit、race、policy、per-unit、harnessをunit/integrationで検証する | 各FRに少なくとも1つのtest traceがあり、関連・全suiteがgreen |
| NFR-08 | Distribution | generated artifactsを手編集せずcanonical sourceから再生成する | `dist:check`と`promote:self:check`がともにexit 0 |

## Constraints

1. Standing grantは`GRANT_ISSUED` / `GRANT_REVOKED`を正本とし、新しい設定file、database、state fieldを作らない。
2. solo modeにleaderは存在しないため、team modeのdelegate-approvalを再利用せず、`DELEGATED_APPROVAL`を発生させない。
3. `HUMAN_TURN`要件自体を緩和せず、grantを別の正当なauthorization sourceとして追加する。
4. standing grant専用の擬似的な`gate`値を追加しない。
5. stderr文字列判定を制御フローに使用しない。
6. frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) のmerge、cherry-pick、実装形状依存を行わない。
7. Application Design承認前に実装コードを変更しない。

## Assumptions

1. Issue #1466と承認済みScopeに基づき、solo modeのgrant発行・取消も本intentに含む。
2. Grant Idは監査correlation用のopaque identityであり、具体的なcarrier shapeは設計で決める。
3. grant-backed routeはquality ritualを自動化せず、approval human turnだけを償却する。
4. full dependency installはConstructionの検証前に`bun install --frozen-lockfile`で回復可能である。

## Out of Scope

- 新しいgrant scope、無期限grant、runtime TTL設定
- standing grantによるreject、Request Changes、halt-and-ask、不可逆external actionの自動判断
- team leader/delegation redesign
- 一般的なgate framework全面再設計
- AWS、network authorization service、database/data migration
- unrelatedな巨大core file分割やadjacent refactor

## Traceability

| Requirement | Exact source section | Verification owner |
|---|---|---|
| FR-01–05 | `scope-document.md` § In Scope / Grant lifecycle、`architecture.md` § Issue #1466 solo standing grant、`code-structure.md` § Issue #1466 solo standing grant | grant/state unit + lifecycle integration |
| FR-06–11 | `intent-statement.md` § Problem Statement・§ Initial Scope Signal、`scope-document.md` § In Scope / Gate authorization、`architecture.md` § Interaction Diagrams | directive schema + conductor integration |
| FR-12–18 | `intent-statement.md` § Success Metrics 2–4、`scope-document.md` § Safe fallback・§ Value Stream 4–5、`architecture.md` § 不変条件と候補 seam | lock/audit/race integration |
| FR-19 | `intent-statement.md` § Success Metrics 5、`business-overview.md` § Issue #1466 の成功境界 | team regression integration |
| FR-20 | `scope-document.md` § Existing policy preservation・§ Success Boundary / phase boundary、`architecture.md` § 不変条件と候補 seam | policy unit + integration |
| FR-21 | `team-practices.md` § Walking Skeleton、`scope-document.md` § Success Boundary / walking skeleton | stance/scope matrix tests |
| FR-22–23 | `intent-statement.md` § Success Metrics 7、`code-structure.md` § gate と per-unit の構造 | per-unit orchestration integration |
| FR-24–26 | `intent-statement.md` § Success Metrics 8–9、`scope-document.md` § Contract and distribution・§ Verification、`team-practices.md` § Code Style | packaging/drift/docs tests |
| NFR-01–04 | `scope-document.md` § Safe fallback・§ Delivery Principles、`architecture.md` § Interaction Diagrams・§ 不変条件と候補 seam | audit/race/security/reliability tests |
| NFR-05–08 | `intent-statement.md` § Success Metrics 5・8・9、`team-practices.md` § Testing Posture・§ Code Style、`code-structure.md` § Issue #1466 solo standing grant | regression/type/full-suite/drift checks |

## Open Questions

要求上の未解決事項はない。Q1は「失効時刻降順→発行監査時刻降順→Grant Id辞書順昇順」で解決済みであり、solo routeだけへ適用する。Grant Id carrier、exact-ID lookup、typed fallback directiveの具体方式はApplication Designで最低2案を比較し、設計gateで承認する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T05:17:30Z
- **Iteration:** 1
- **Scope decision:** none

要件は広範だが、安全性に関わるwalking skeletonの適用行列、複数grantの決定的選択、ライフサイクルの否定ケース、要件単位のトレーサビリティが未確定である。

### Findings

- BLOCKER: FR-21はamadeus-featureかつstance有効時に限定され、scope-dependentで解決される実効stanceとgreenfield-shaped scopeを含む適用行列がない。stance・scope・期待結果の表とfixtureが必要。
- BLOCKER: FR-07の選択規則は同一expiry時のtie-breakがなくテスト不能。完全な比較順序または権威ある既存契約が必要。
- MAJOR: FR-01/03/04にTTLの単位・範囲・不正値、取消の不存在・intent不一致・取消済み、human provenance、重複監査件数の契約が不足。
- MAJOR: トレーサビリティが粗く、各FR/NFRをconsumeした成果物の正確な節へ対応付ける必要がある。
- MAJOR: 未解決事項があるのに質問ゼロとしている。質問化するか権威ある根拠から確定する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T05:27:12Z
- **Iteration:** 2
- **Scope decision:** none

第1回の5指摘はすべて解消された。Issue #1466の成功境界、重要gateでの人間統制、route/commit間の同一Grant Id再検証、typed fallback、team mode非回帰がテスト可能な契約として定義されている。

### Findings

- walking-skeleton行列はon、off、scope-dependent、未記録、greenfield-shaped amadeus-feature、実効値不明時のfail-closed、phase-boundary重複を網羅した。
- 複数grantは失効時刻降順、発行監査時刻降順、Grant Id辞書順昇順の完全順序でsolo限定に固定された。
- grant lifecycleの否定ケースはfresh turn不在、scope/TTL/ID不正、unknown/cross-intent/already-revoked取消、重複呼出し、監査増分まで定義された。
- FR/NFRは許可済み成果物の具体的な節と検証ownerへ追跡可能になった。
- Q1の選択肢、回答、時刻、回答modeがFR-07へ反映された。
- team modeのdirective、state、audit、leader/delegation経路は既存fixture/golden一致を要求しスコープ外変更を禁止している。
