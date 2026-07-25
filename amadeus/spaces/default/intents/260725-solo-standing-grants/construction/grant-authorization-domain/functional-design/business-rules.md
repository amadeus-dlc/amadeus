# Business Rules: grant-authorization-domain

## Design Inputs

規則は`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`から導出する。

## Lifecycle Rules

| Rule | Condition | Outcome | Trace |
|---|---|---|---|
| BR-01 | mode unset/empty | `solo` | FR-01–04 |
| BR-02 | mode `solo` / `team` | 同値を返す | FR-01–04, FR-19 |
| BR-03 | その他のmode | mutation前にfatal | NFR-03 |
| BR-04 | issueにfresh human、supported scope、valid TTL | `GRANT_ISSUED` exactly 1 | FR-01, FR-04 |
| BR-05 | TTL省略 | 14,400,000ms | FR-04 |
| BR-06 | explicit TTL finite and `> 0` | 小数・上限なしで受理 | FR-04 |
| BR-07 | revokeにfresh humanとvalid ID | `GRANT_REVOKED` exactly 1 | FR-03 |
| BR-08 | unknown/cross-intent/already-revoked ID | revoke eventをappend | FR-03 |

## Candidate Rules

| Rule | Condition | Outcome | Trace |
|---|---|---|---|
| BR-09 | issue intentがactive intentと異なる | candidate外 | FR-02 |
| BR-10 | `expiry <= now` | candidate外 | FR-05 |
| BR-11 | 同IDのrevoke eventあり | candidate外 | FR-05 |
| BR-12 | issuer provenance不正 | candidate外 | FR-05 |
| BR-13 | 複数solo candidate | expiry desc → issued timestamp desc → Grant Id asc | FR-07 |
| BR-14 | team mode | 既存team finderをそのまま使用 | FR-19 |
| BR-14a | 同じGrant Idのvalid issue eventが0件または複数件 | candidate外 | FR-05, FR-12 |

## Gate Policy Rules

| Rule | Condition | Outcome | Trace |
|---|---|---|---|
| BR-15 | gateなし | grant探索なし | FR-06 |
| BR-16 | phase boundary + opt-inなし | human-only | FR-20 |
| BR-17 | stance `on` + first Construction gate | human-only | FR-21 |
| BR-18 | stance `off` + first Construction gate | 通常grant条件を評価 | FR-21 |
| BR-18a | scope-dependent/未記録 + effective-on | human-only | FR-21 |
| BR-18b | scope-dependent/未記録 + effective-off | 通常grant条件を評価 | FR-21 |
| BR-18c | scope-dependentの実効値解決不能 | fail-closedでhuman-only | FR-21 |
| BR-18d | `amadeus-feature` + scope-dependent | greenfield-shaped/effective-onとしてhuman-only | FR-21 |
| BR-19 | per-unit未完 | grant carrierなし | FR-22 |
| BR-20 | per-unit all-covered final gate | 他条件を満たせばcandidate探索 | FR-22 |
| BR-21 | reject/Request Changes/halt-and-ask | grant authorization適用外 | FR-11 |

## Receipt and Revalidation Rules

| Rule | Condition | Outcome | Trace |
|---|---|---|---|
| BR-22 | route candidate選択成功 | workspace outer lock内でRoute Idがspace-wide 0件と確認し、protected receipt append後だけcarrier返却 | FR-08, NFR-01 |
| BR-23 | workspace outer lock内でspace全intentのRoute Id receiptがexactly oneかつfield一致 | receipt所有intentをtransaction targetへpinし、owner intent inner lockでexact grant再検証へ進む | FR-12 |
| BR-24 | receipt欠落/重複/field不一致 | typed `no-longer-authorizes`でhuman fallback | NFR-03, FR-15–17 |
| BR-25 | exact grantがcommit時もvalid | verified Grant Idを返す | FR-12–14 |
| BR-26 | expiry/revoke/out-of-scope/intent/provenance invalid | typed `no-longer-authorizes` | FR-13, FR-15 |
| BR-27 | 後発grantが存在 | route-selected IDを差し替えない | FR-12 |
| BR-28 | exact Grant Idのissue eventが0件または複数件 | typed `no-longer-authorizes` | FR-12–17 |
| BR-29 | audit I/O、state corruption、wire parse failure | 既存fatal error | NFR-04 |

## Audit Invariants

- `GRANT_ISSUED`と`GRANT_REVOKED`だけがgrant lifecycleの正本である。
- `GATE_AUTHORIZATION_SELECTED`はgeneral audit CLIからmintできないprotected eventである。
- route receipt append失敗時はcarrierを返さない。
- expected invalidityはERRORではなく、approval transactionにhuman fallbackを指示するdomain outcomeである。
- grant-backed successで`GATE_APPROVED.Grant Id`へ渡せるのはlock内で検証済みのIDだけである。
- `GRANT_REVOKED` appendとgrant-backed approvalはreceipt所有intentの同一lockで直列化し、exact grant再検証からapproval mutationまで取消を割り込ませない。
- route receipt appendとcommitは既存workspace-level intent registry lockを共有し、space-wide cardinality checkからappendまたはtransaction完了まで保持する。lock順序はworkspace → owner intentだけを許す。
- active-intent cursorがreceipt非所有intentを指していても、そのintentのapproval、fallback、audit、state mutationは0である。

## Validation Matrix

unit testsはmode全値、TTL境界、極小正数TTLの丸め、malformed event、intent mismatch、issue ID cardinality 0/1/複数、expiry equality、timestamp equality、Grant Id tie-break、phase/skeleton/per-unit matrix、receipt cardinalityとfield mismatchをcoverする。walking-skeleton fixtureはon、off、scope-dependent effective-on/effective-off、未記録、解決不能、phase-boundary precedenceを含む。team fixtureは既存candidate selectionの観測結果をgoldenとして固定する。
