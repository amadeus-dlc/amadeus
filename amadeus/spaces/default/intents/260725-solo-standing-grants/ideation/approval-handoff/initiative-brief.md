# Initiative Brief: Solo Standing Grant

## Executive Summary

Amadeusのsolo modeで、active intentに束縛されたtime-boxed standing grantを通常stage gateの認可根拠として利用可能にする。これにより、大きなscopeでの反復的な個別承認を減らしながら、`HUMAN_TURN`保証、重要境界の人間統制、正確なaudit provenance、team modeの既存挙動を維持する。

推奨判断は**Inceptionへ進む**である。現行監査eventモデルとTypeScript/Bun toolchain内で実現可能であり、外部serviceや新しい設定modelは不要である。ただし、設計承認前に実装せず、cross-intent、route/commit race、typed fallback、team非回帰の設計を先に確定する。

## Problem and Customer

主利用者はsolo modeでAmadeus intentを運用する人間である。現在はstanding grantを発行する意思があっても、通常gateごとに新しい`HUMAN_TURN`が必要になる。問題はgateを減らすことではなく、gateを維持したまま有効なgrantを別の認可根拠にできないことである。

成功は、有効なgrantで通常gateを承認でき、commit時検証済みGrant Idを監査し、grantが無効なら副作用なくhuman gateへ戻ることで測定する。

## Current Team-Mode Evidence

現行team modeは次の責務連鎖を持つ。

1. leaderのfresh `HUMAN_TURN`を根拠に`GRANT_ISSUED`
2. active space全体から有効grantを探索
3. target intentのphase／skeleton規則でgate適用判定
4. grantで`DELEGATED_APPROVAL`を認可しGrant Idを付与
5. conductorがissuer provenanceを検証
6. 通常approveが`GATE_APPROVED`と`STAGE_COMPLETED`を原子的にcommit
7. fresh `HUMAN_TURN`を根拠に`GRANT_REVOKED`

79件の関連基線testが成功している。このteam経路は互換性制約であり、solo modeへ流用または変更しない。

## Scope Boundary

### Included

- soloでのintent-bound grant発行・取消
- gate policyとauthorization sourceの分離
- route時Grant Id carrier
- commit時同一grant再検証
- 正確な`GATE_APPROVED.Grant Id`
- expiry・revocation・target mismatch時のtyped human fallback
- phase-boundary、walking-skeleton、per-unit最終gate規則
- team非回帰、全harness同義性、documentation、包括的test

### Excluded

- 新設定modelまたはstate設定
- standing grant専用の擬似gate値
- stderr文字列判定
- soloでのleader／delegation event
- reject／Request Changes／halt-and-askのgrant認可
- 外部認可service、AWS、database
- PR #1468の実装取り込み

## Critical Risks and Treatments

| Risk | Impact | Required treatment |
|---|---|---|
| cross-intent grant | Critical | 発行時target bindingとtarget限定resolver |
| route/commit grant差替え | Critical | Grant Id明示carrierとid指定再検証 |
| expiry/revocation race | Critical | lock内でaudit前に再検証 |
| fallbackの誤error | High | error directiveと別のtyped fallback |
| team regression | High | solo固有経路と現行team基線test |
| boundary over-authorization | Critical | 既存gate predicateを共用 |
| per-unit再実行 | Medium | all-covered最終gateだけを候補化 |
| harness drift | High | core正本とgenerated drift check |

## Delivery Sequence

1. Reverse Engineeringで現行call graph・projection・test seamを確定
2. Requirementsでgrant lifecycle、authorization、fallback、audit不変条件をtestableに定義
3. Application Designでgate policyとauthorization sourceを分離
4. Units／Delivery Planningでrisk-firstの実装DAGを確定
5. Construction designでroute/commit raceとNFRを固定
6. Code Generationでcore、tests、harness投影を実装
7. Build and Testでtype、related、full、drift evidenceを確定

## Ideation Readiness

| Readiness item | Status | Evidence |
|---|---|---|
| Intent captured | Ready | `../intent-capture/intent-statement.md` |
| Feasibility confirmed | Ready with design conditions | `../feasibility/feasibility-assessment.md` |
| Constraints registered | Ready | `../feasibility/constraint-register.md` |
| Scope defined | Ready | `../scope-definition/scope-document.md` |
| Backlog prioritized | Ready | `../scope-definition/intent-backlog.md` |
| Critical risks assigned | Ready | `../feasibility/raid-log.md` |
| Market validation | N/A | market-research SKIP、repository-internal change |
| Visual concept | N/A | rough-mockups SKIP、visual UIなし |
| Team formation | N/A | team-formation SKIP、既定agent workflow |

## Go / No-Go Recommendation

**GO to Inception**を推奨する。

GOの条件は次のとおりである。

- 本initiative briefとphase verificationを人間が承認する。
- Inceptionでは凍結PRを設計前提にせず、現行mainのreverse engineeringを正本にする。
- application-design gateで4つの重要判断を承認するまで実装しない。
- acceptance criteriaと包括的検証をscope削減対象にしない。

## Upstream Traceability

- `../intent-capture/intent-statement.md`: Problem、Customer、Success Metrics
- `../scope-definition/scope-document.md`: In／Out、Success Boundary、Value Stream
- `../scope-definition/intent-backlog.md`: Must 12、Should 4、proto-Unit候補
- `../feasibility/feasibility-assessment.md`: team flow、solo gap、feasibility verdict
- `../feasibility/constraint-register.md`: mandatory・existing-system・audit constraints

competitive analysis、team assessment、wireframesはscopeでSKIPされており、存在しない内容を補完していない。
