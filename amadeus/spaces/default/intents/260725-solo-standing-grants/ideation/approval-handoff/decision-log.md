# Ideation Decision Log: Solo Standing Grant

## Confirmed Decisions

| ID | Decision | Rationale | Evidence |
|---|---|---|---|
| D-01 | `amadeus-feature` scopeを使う | Amadeus自身の利用者向け機能拡張 | intent state、Intent Capture approval |
| D-02 | PR #1468は凍結試作として参照のみ | 実装形状に引きずられずmainから設計する | user constraint |
| D-03 | standing grantはaudit eventのまま | 新設定modelを作らずprovenanceを正本にする | intent statement |
| D-04 | team mode経路を変更しない | leader／delegationの既存利用者を保護 | feasibility |
| D-05 | soloはteam delegationを流用しない | solo topologyにleaderが存在しない | feasibility |
| D-06 | `HUMAN_TURN`要件を弱めない | grantを追加の認可根拠とする | intent statement |
| D-07 | gate policyとauthorization sourceを分離する | gateの存在と承認者を混同しない | scope |
| D-08 | route時Grant Idをcommitへ明示搬送する | grant差替えを防ぐ | feasibility |
| D-09 | commit時に同じgrantを再検証する | expiry・revocation TOCTOUを閉じる | feasibility |
| D-10 | 無効grantはhuman gateへ通常fallback | error／completion auditを誤記録しない | acceptance |
| D-11 | 擬似gate値とstderr判定を禁止する | typed contractを維持する | scope |
| D-12 | phase／skeleton規則を維持する | 重要境界の人間統制 | acceptance |
| D-13 | per-unitは最終gateだけを候補化する | stage／reviewer再実行を避ける | acceptance |
| D-14 | risk-first＋dependency-firstで進める | criticalなfail-open／誤commitを先に閉じる | scope |
| D-15 | 設計gate承認前に実装しない | user controlを維持する | user constraint |

## Deferred Design Decisions

| ID | Decision needed | Options to evaluate | Decision stage |
|---|---|---|---|
| P-01 | solo target bindingのaudit field | explicit target intent／issuer intent reuse | application-design |
| P-02 | directive authorization carrier | optional nested authorization／別field | application-design |
| P-03 | commit typed fallback contract | result union／dedicated command outcome | application-design |
| P-04 | eligibility predicate ownership | shared resolver／selectionとvalidation分離 | application-design |

いずれも実装開始前に人間gateで承認する。

## Rejected Alternatives

| Alternative | Rejection reason |
|---|---|
| `gate: "granted"`等の擬似gate値 | gate policyとauthorization sourceを混同する |
| teamの`DELEGATED_APPROVAL`をsoloで生成 | leader不在のtopologyに合わない |
| commit時に任意の最新grantを再探索 | route時に選んだgrantとの同一性がない |
| state toolのstderrをparseしてfallback | 非型付きで脆弱、error auditを誘発する |
| grant失効をsystem errorにする | 正常なauthorization raceを誤分類する |
| 新しいgrant設定file | audit event正本と既存lifecycleに反する |
| PR #1468をmergeして修正 | 凍結試作を実装前提にする |

## Stage Decisions

| Stage | Approval outcome | Main result |
|---|---|---|
| Intent Capture | Approved | 問題、利用者、9 acceptance、非交渉境界 |
| Feasibility | Approved | 条件付き実現可能、現行team flow、8 risks |
| Scope Definition | Approved | route-to-commit vertical slice、prioritized backlog |
| Approval & Handoff | Pending | Ideation→Inception go/no-go |

## N/A Decisions

- Market Research: SKIP。外部市場claimを投資根拠にしない。
- Team Formation: SKIP。追加mob・staffingを要求しない。
- Rough Mockups: SKIP。visual UIを変更しない。

これらの不存在は未完了ではなくscope上の非適用であり、後続stageは仮想成果物を補完しない。

## Upstream Traceability

本logは`../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`の承認済み判断を集約している。
