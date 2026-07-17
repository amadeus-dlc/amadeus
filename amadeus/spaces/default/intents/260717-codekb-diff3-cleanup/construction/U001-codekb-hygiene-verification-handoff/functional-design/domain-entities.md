# Domain Entities — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Modelling Boundary

ここでいうentityは、`unit-of-work.md` のU001がversion-controlled recordに保持する証拠概念である。`unit-of-work-story-map.md` にstoryはなく、`requirements.md` は新規schema / databaseを禁止し、`components.md` と`services.md` は新規runtime component / serviceを0件としている。従って以下はapplication class、database entity、API DTOとして実装せず、`component-methods.md` の型と結果semanticsを文書上で厳密化する。

## Evidence Value Objects

### MeasurementRef

| Attribute | Type / constraint | Meaning |
|---|---|---|
| `ref` | non-empty git ref string | 呼出側が明示した測定対象 |
| `sha` | resolved full commit SHA | 全検査を固定するimmutable identity |

`ref`だけ、short SHA、検査途中で前進したbranch headはidentityにならない。

### MarkerCounts

| Attribute | Type / constraint | Meaning |
|---|---|---|
| `measurement` | `MeasurementRef` | 計数対象 |
| `path` | 対象2 pathのいずれか | 対象Markdown |
| `counts` | 4語彙それぞれの非負整数 | 行頭一致の全数 |
| `matches` | file:line list | 非0時の診断証拠 |

2個の`MarkerCounts`が揃い、8値すべて0のときだけcontent cleanを表現できる。合計0だけの縮約結果は受理しない。

### HeadingCounts

| Attribute | Type / constraint | Meaning |
|---|---|---|
| `measurement` | `MeasurementRef` | 計数対象 |
| `path` | 対象2 pathのいずれか | 対象Markdown |
| `latest` | non-negative integer | 最新を示すH2件数 |
| `history260715` | non-negative integer | 保存対象履歴H2件数 |

2個の`HeadingCounts`が揃い、両方とも`latest=1`かつ`history260715=1`の場合だけstructure cleanを表現できる。

### AncestryEvidence

| Attribute | Type / constraint | Meaning |
|---|---|---|
| `measurement` | `MeasurementRef` | descendant候補 |
| `fixSha` | `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` | 固定した修正commit |
| `verdict` | `ancestor` または `non-ancestor` | git graph上の関係 |

`AncestryEvidence`はcontent状態を所有せず、`non-ancestor`もmarker残存を意味しない。

### IssueObservation

| Attribute | Type / constraint | Meaning |
|---|---|---|
| `issue` | Issue #1129のimmutable identity | close対象 |
| `state` | `OPEN` または `CLOSED` | 観測時の外部状態 |
| `observedAt` | timestamp | stateを観測した時点 |

`close-eligible`の入力としてadmissibleなのは、landed main再計測後に取得した`state=OPEN`だけである。証拠完成前の`state=CLOSED`はordering violationを表し、正常なclose完了を表さない。

## Aggregate Evidence Records

### PreLandingEvidence

| Attribute | Cardinality / constraint |
|---|---|
| `measurement` | exactly 1 |
| `markerCounts` | exactly 2、対象path重複なし |
| `headingCounts` | exactly 2、対象path重複なし |
| `ancestry` | exactly 1、同じmeasurement |
| `ciVerdict` | exactly 1、greenのみadmissible |
| `independentReviews` | exactly 2、起票者以外、identity重複なし、両方green |
| `sensorVerdicts` | declared setを全件保持し、全件green |
| `learningSelection` | §13の確定選定結果とprovenance |
| `gateProvenance` | approved verdictと、その承認時に有効なstanding grantまたはhuman turn |
| `pushSha` | exactly 1、当該成果物を含むfull SHA |

`PreLandingEvidence`はすべてのfieldがadmissibleで初めて構築可能とする。failed sensor、non-green review、未確定§13、unresolved / rejected gate、承認時点で失効したgrant、不完全なrecordを`gate-ready`として表現しない。

### LandedMainEvidence

| Attribute | Cardinality / constraint |
|---|---|
| `landedMeasurement` | exactly 1、human landing後のmain refとfull SHA |
| `markerCounts` | exactly 2、landed SHAから新規計測 |
| `headingCounts` | exactly 2、landed SHAから新規計測 |
| `issueObservation` | exactly 1。close eligibility評価時は`state=OPEN`必須 |

`LandedMainEvidence`は`PreLandingEvidence`の件数を参照コピーしない。landed SHAから再生成する。再計測greenより前にIssueがCLOSEDなら、recordはclose evidenceではなくordering violationを表す。

## Lifecycle States and Transitions

| State | Entry condition | Allowed next state | Owner |
|---|---|---|---|
| `measuring` | `MeasurementRef`構築済み | `pre-landing-stopped` / `pre-landing-evaluated` | conductor |
| `pre-landing-stopped` | ref / content / structure / admissibility不一致 | 新しい`measuring`のみ | conductor |
| `pre-landing-evaluated` | 全pre-landing検査完了 | `gate-ready` / `pre-landing-stopped` | conductor |
| `gate-ready` | `PreLandingEvidence`完全・green | `landing-pending` | conductorからhumanへhandoff |
| `landing-pending` | human landing未実施 | `landed-measuring` | human / leader |
| `landed-measuring` | landed main ref受領 | `close-eligible` / `post-landing-stopped` | post-landing verifier |
| `post-landing-stopped` | landed検査red、ref不明、またはpremature close | 新しいlanded main refで`landed-measuring` | post-landing verifier |
| `close-eligible` | landed content / structure greenかつIssue OPEN | external Issue close | leader / human |

Engine workflowの`done`はこの状態機械とは別軸である。main未着地ならdomain stateは`landing-pending`であり、`close-eligible`へ自動遷移しない。
`post-landing-stopped`からの再試行ではadmissibleな`PreLandingEvidence`を保持し、pre-landing検査へ巻き戻さず新しいlanded main refだけを再計測する。

## Relationships and Invariants

```text
MeasurementRef 1 ── 2 MarkerCounts
               ├── 2 HeadingCounts
               └── 1 AncestryEvidence

PreLandingEvidence = 上記4種 + CI + 2 Reviews + Sensors + §13 + Gate + Push SHA
LandedMainEvidence = 新しいMeasurementRef + 新しいMarkerCounts + 新しいHeadingCounts + Issue state
```

- すべてのpre-landing子要素は同じ`MeasurementRef.sha`を参照する。
- Pre-landingとlanded-mainの`MeasurementRef`は別identityとして保持する。
- `pushSha`、fix SHA、measurement SHA、landed main SHAを同一fieldへ畳まない。
- 証拠recordは技術文書とgit metadataだけを含み、secret、PII、runtime user dataを含まない。
- UI entity、frontend state、form validationはunitに存在しないため非該当である。
