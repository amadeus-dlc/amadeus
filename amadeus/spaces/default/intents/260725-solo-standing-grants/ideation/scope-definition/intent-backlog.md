# Intent Backlog: Solo Standing Grant

## Prioritization Method

MoSCoWで利用者価値の必須境界を定め、同一priority内はrisk-first＋dependency-firstで並べる。すべてのMust itemは`scope-document.md`のSuccess Boundaryへ追跡し、後続のUnits Generationで実装単位へ分解する。

## Must Have

| Order | ID | Capability | User value | Primary risk closed | Depends on |
|---:|---|---|---|---|---|
| 1 | M-01 | 現行team grant flowの完全な影響範囲 | 既存利用者の回帰を防ぐ | hidden call site | 承認済みfeasibility |
| 2 | M-02 | solo grantのintent-bound lifecycle | 別intentを認可せず発行・取消できる | cross-intent | M-01 |
| 3 | M-03 | gate policyとauthorization sourceの分離 | gateを消さずgrantを利用できる | pseudo-gate drift | M-01 |
| 4 | M-04 | route時Grant Id選択と明示carrier | commit対象を固定できる | grant substitution | M-02、M-03 |
| 5 | M-05 | commit時同一grant再検証 | expiry・revocation raceを閉じる | TOCTOU | M-04 |
| 6 | M-06 | typed human-gate fallback | 無効grantで誤完了・誤errorを出さない | audit corruption | M-05 |
| 7 | M-07 | policy exclusion preservation | 重要境界を人間が判断する | over-authorization | M-03、M-05 |
| 8 | M-08 | per-unit最終gate統合 | stage／reviewerを再実行しない | duplicate work | M-03、M-06 |
| 9 | M-09 | team mode非回帰 | 既存leader／delegation体験を維持 | compatibility | M-01〜M-08 |
| 10 | M-10 | 全harness conductor同義性 | harnessにより安全性が変わらない | semantic drift | M-04〜M-08 |
| 11 | M-11 | contract test suite | directive・state・auditを検証できる | silent regression | M-02〜M-10 |
| 12 | M-12 | full validationとdrift evidence | release判断に十分な証拠 | incomplete delivery | M-11 |

## Should Have

| ID | Capability | Rationale | Depends on |
|---|---|---|---|
| S-01 | `--doctor` active grant表示のsolo意味論更新 | operatorがtargetとTTLを確認できる | M-02 |
| S-02 | help text更新 | 発行・取消・対象gateの利用方法を明示 | M-02、M-07 |
| S-03 | state-machine reference更新 | authorizationとfallback不変条件を保守者へ伝える | M-03〜M-06 |
| S-04 | stage protocol／conductor説明更新 | quality path後のgrant commitとfallbackを統一 | M-10 |

## Could Have

| ID | Capability | Reason deferred |
|---|---|---|
| C-01 | grant一覧・履歴専用UI | auditとdoctorで今回の利用価値は成立する |
| C-02 | 複数grant選択policyのoperator設定 | 新設定modelを避け、決定的resolverを優先する |
| C-03 | grant対象stageの任意pattern | Issueの`stage-gates` scopeを超える |
| C-04 | TTL preset UX | default 4時間と明示`--ttl-ms`で成立する |

## Won't Have

| ID | Excluded capability | Exclusion reason |
|---|---|---|
| W-01 | standing grant専用gate値 | gateとauthorizationを混同する |
| W-02 | stderr substring fallback | typed contractを破る |
| W-03 | new persistent settings model | audit event正本に反する |
| W-04 | solo delegation event | leader不在のtopologyに適合しない |
| W-05 | team path rewrite | 非回帰条件に反する |
| W-06 | PR #1468 implementation import | 凍結試作を前提にしない |

## Proto-Unit Candidates

| Candidate | Vertical responsibility | Backlog coverage | Exit evidence |
|---|---|---|---|
| U-A Grant Lifecycle | solo発行・取消・intent binding・resolver | M-02、S-01、S-02 | lifecycle・isolation tests |
| U-B Gate Authorization | gate policy、route carrier、eligibility | M-03、M-04、M-07 | directive・policy tests |
| U-C Approval Commit | id再検証、success audit、typed fallback | M-05、M-06 | race・audit exact-count tests |
| U-D Per-Unit Integration | all-covered gateへの統合 | M-08 | no-rerun integration test |
| U-E Compatibility & Projection | team非回帰、全harness、docs、drift | M-09〜M-12、S-03、S-04 | full/type/drift results |

Proto-Unitは最終Unitではない。Reverse Engineering、Requirements、Application Designの結果を受けてUnits Generationで境界と依存DAGを確定する。

## Dependency Sequence

```text
Current-flow evidence
        |
        v
Intent-bound grant lifecycle
        |
        v
Gate authorization carrier
        |
        v
Commit revalidation + typed fallback
        |
        +------> Per-unit integration
        |
        v
Compatibility + harness projection
        |
        v
Full verification
```

## Definition of Scope Done

- Must Have 12項目がtestable requirements、design、code、testへ追跡されている。
- Should Haveの文書・diagnostic surfaceが実装意味論と一致する。
- Could／Won't項目が変更差分へ混入していない。
- team／solo、success／fallback、ordinary／boundary、single／per-unitの組合せが検証されている。
- 型check、関連test、全test、生成物drift checkが成功している。

## Upstream Traceability

- `../intent-capture/intent-statement.md`: 利用者価値とacceptance boundary
- `../feasibility/feasibility-assessment.md`: feasibility verdictと現行team flow
- `../feasibility/constraint-register.md`: C-01〜C-13、E-01〜E-07

各Must itemはこれらの上流成果物に接地し、上流にない機能はCouldまたはWon'tへ分離した。
