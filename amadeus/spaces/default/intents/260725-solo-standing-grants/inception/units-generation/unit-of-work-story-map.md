# Unit of Work Story Map: Solo Standing Grant

## 入力とマッピング方法

本stageでは user-stories 成果物が生成されていないため、Requirements Analysis の `requirements.md` にあるFR/NFRを検証可能なdelivery scenarioとしてUnitへ割り当てる。境界の根拠は Application Design の `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md` である。

「story implementation order」は各Unit内部の契約構築順を示すだけであり、Unit間の経済的な実装順やcritical pathは示さない。

## grant-authorization-domain のマップ

| Unit内順序 | Delivery scenario | Requirement | 完了条件 |
|---:|---|---|---|
| 1 | operating modeをcanonicalに解決する | FR-01–04, FR-19, NFR-03 | unset/empty/solo/team/unknownのfixtureが決定的に通る |
| 2 | solo grantを監査イベントとして発行・取消する | FR-01–05 | TTL、fresh turn、scope、ID、重複eventのpositive/negative fixtureが通る |
| 3 | intent-bound候補を完全順序で選ぶ | FR-02, FR-05, FR-07 | expiry/timestamp/Grant Idのtie-breakとteam非変更を検証する |
| 4 | gate eligibilityとreceipt identityを検証する | FR-06, FR-20–22, NFR-01–03 | phase/skeleton/per-unit/provenance/exact Route Id matrixが通る |

## solo-gate-transaction のマップ

| Unit内順序 | Delivery scenario | Requirement | 完了条件 |
|---:|---|---|---|
| 1 | routeでgrant carrierを明示する | FR-06–10 | `gate`を維持し、all-or-none carrierとprotected receiptが一致する |
| 2 | grant-backed routeでもquality ritualを完遂する | FR-09 | stage body、reviewer、sensor、§13 learningsのinvocation countが初回に各1回となる |
| 3 | approve以外を自動認可しない | FR-11 | reject、Request Changes、halt-and-askの各fixtureでgrant carrierが承認eventを発生させずhuman controlを要求する |
| 4 | reportからcommitへ同じIDを渡す | FR-08, FR-10, FR-12 | strict directive validationとGrant Id substitution fixtureが通る |
| 5 | lock内でexact grantを再検証する | FR-12–14, NFR-02–04 | expiry/revoke/cross-intent/provenance raceをsleepなしで再現できる |
| 6 | expected invalidityをhuman gateへ戻す | FR-15–18 | `await-approval`、audit増分0、state不変、fresh human approval成功を検証する |
| 7 | per-unit最終gateだけを認可する | FR-22–23 | body/reviewer countがfallback前後で不変になる |

## harness-contract-and-regression のマップ

| Unit内順序 | Delivery scenario | Requirement | 完了条件 |
|---:|---|---|---|
| 1 | canonical conductor契約を記述する | FR-24–26 | route→report→fallbackとhuman再開の意味論が明記される |
| 2 | 全6 harnessへ同じ契約を投影する | FR-24–25, NFR-08 | 6 harnessの生成物が同一意味論を持ちdist driftが0になる |
| 3 | help/doctor/referenceの公開契約を整合確認する | FR-26 | doctorが新verb・field・eventを検査すべきかをfixtureで判定し、必要な更新または変更不要の証跡を残す |
| 4 | team/policy/per-unitを回帰検証する | FR-19–23, NFR-05–07 | leader/delegation、phase、skeleton、all-covered fixtureがgreenになる |
| 5 | repository全体を収束させる | NFR-05–08 | 型、関連test、全test、生成物drift checkがすべてexit 0になる |

## Cross-cutting scenarios

| Scenario | Primary owner | Supporting owner | Requirement |
|---|---|---|---|
| 監査first atomicityとprotected event | grant-authorization-domain | solo-gate-transaction | FR-14, FR-17, NFR-01 |
| route/commit TOCTOUとsubstitution防止 | solo-gate-transaction | grant-authorization-domain | FR-12–17, NFR-02–04 |
| team modeの完全非回帰 | harness-contract-and-regression | grant-authorization-domain | FR-19, NFR-05 |
| phase-boundary/walking-skeleton/per-unit policy | grant-authorization-domain | solo-gate-transaction, harness-contract-and-regression | FR-20–23 |
| 全harnessのdirective/state/audit一致 | harness-contract-and-regression | solo-gate-transaction | FR-24–26, NFR-07–08 |

## Coverage Verification

- FR-01–05: grant-authorization-domainに割当済み。
- FR-06–11: solo-gate-transactionを主担当とし、認可predicateはgrant-authorization-domainが支援する。
- FR-12–18: solo-gate-transactionに割当済み。
- FR-19–23: harness-contract-and-regressionを回帰ownerとし、domain/transactionが実装を所有する。
- FR-24–26: harness-contract-and-regressionに割当済み。
- NFR-01–04: grant-authorization-domainとsolo-gate-transactionに割当済み。
- NFR-05–08: harness-contract-and-regressionに割当済み。
- すべてのUnitに少なくとも1つのdelivery scenarioがあり、未割当のFR/NFRはない。
