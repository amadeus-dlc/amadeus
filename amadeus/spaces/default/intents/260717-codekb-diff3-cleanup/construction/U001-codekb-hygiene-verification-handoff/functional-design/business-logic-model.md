# Business Logic Model — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Design Boundary

本unitはapplication codeやruntime serviceを実装しない。`unit-of-work.md` が定義するU001を、`requirements.md` のFR-1〜FR-5、`components.md` の4境界、`component-methods.md` の検証操作、`services.md` のoperational flowに沿って実行可能な証拠処理順へ具体化する。`unit-of-work-story-map.md` にstoryはなく、unit内の順序は証拠の依存関係だけで決まる。

処理対象は次の2つに限定する。

1. `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md`
2. `amadeus/spaces/default/codekb/amadeus/code-structure.md`

この設計はAPI、schema、database、queue、AWS resource、UI、常駐processを追加しない。各操作は既存gitと決定的な全数走査により証拠を生成し、version-controlled intent recordへ引き渡す。

## End-to-End Workflow

| Step | Operation | Input | Output | Stop condition |
|---|---|---|---|---|
| W1 | Measurement refを固定 | 検証対象の明示git ref | `MeasurementRef(ref, full SHA)` | refをfull SHAへ解決できない |
| W2 | Marker語彙を全数走査 | W1、対象2 path、4語彙 | path×語彙の`MarkerCounts`、一致file:line | いずれかの件数が0以外 |
| W3 | H2を全数計数 | W1、対象2 path | pathごとの`HeadingCounts(latest, history260715)` | いずれかが`(1, 1)`以外 |
| W4 | Fix祖先性を独立検査 | W1、fix SHA `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` | `AncestryEvidence(verdict=ancestor\|non-ancestor)` | git検査自体が実行不能 |
| W5 | Lifecycle evidenceを収集 | W1〜W4、CI、2名review、全declared sensor、§13、gate、push SHA | `PreLandingEvidence` | 必須fieldがmissing / non-green、review非独立、gate未承認／拒否／権限失効 |
| W6 | Pre-landing判定 | W5 | `gate-ready` または `stop(reason, SHA)` | W2 / W3不一致またはW5不足 |
| W7 | Human landing handoff | W6 | landing pendingまたはhumanが返すlanded main ref | 明示承認なし、AIによる自発merge要求 |
| W8 | Landed mainを再計測 | landed mainの明示ref | 新しいW1〜W3相当の実測 | ref不明、marker / H2不一致 |
| W9 | Close eligibility判定 | W8と`IssueObservation(state=OPEN\|CLOSED)` | `close-eligible` または `stop(reason, landed SHA)` | main未着地、再計測未完了／不一致、Issueが証拠より先にCLOSED |

W4の`non-ancestor`は停止理由ではなく独立した系統証拠である。W2とW3がgreenなら孤立fragmentを盲目的に再適用しない。一方、W4が`ancestor`でもW2とW3を省略してcontent cleanとみなさない。

## Decision Flow

```text
explicit ref
  ├─ resolve失敗 ───────────────────────────────> STOP(ref unresolved)
  └─ full SHA
       ├─ marker countに非0あり ────────────────> STOP(content not clean)
       ├─ latest/history H2が各1でない ─────────> STOP(structure mismatch)
       └─ content checks green
            ├─ ancestryを独立記録
            ├─ CI/review/sensor/§13/gate/push不足・non-green ─> STOP(evidence inadmissible)
            └─ gate-ready
                 ├─ human landing未実施 ─────────> PENDING(issue remains open)
                 └─ landed main ref
                      ├─ landed再計測red ─────────> STOP(issue remains open)
                      └─ landed再計測green ───────> CLOSE-ELIGIBLE
```

## Data Transformations and Provenance

変換は一方向で、source evidenceを上書きしない。

1. ref文字列をgitでfull SHAへ解決し、以降の全検査を同一SHAへ固定する。
2. SHA上の2 Markdown本文を行単位で読み、行頭一致を4語彙別・path別の非負整数へ変換する。合計値に畳まず、語彙別の0件を保持する。
3. 同じ本文から最新H2と`260715-opencode-cursor-harness`履歴H2をpath別に計数する。
4. fix commitと測定SHAのgraph関係をcontent結果から独立した列へ記録する。
5. 実測値、CI verdict、2名の独立green review、全declared sensorのgreen verdict、§13選定、承認済みgateの有効なprovenance、push SHAを`PreLandingEvidence`へ束ねる。束ねる前の値も保持する。failed sensor、rejected gate、承認時に失効したgrantはadmissibleな証拠ではない。
6. landing後はbranch結果を再利用せず、landed main SHAから別の実測集合を生成する。

`origin/main`の名称だけ、目視による「clean」、file全体diff、単一のcommit SHAを複数事実の代理値にしない。

## Business Scenarios

### Happy path

branchの明示SHAで4 marker語彙が全pathで0、最新／履歴H2が各1、CI、2名の独立review、全declared sensor、§13、承認済みgate、push証拠がadmissibleなら`gate-ready`となる。human landing後、landed main SHAで同じcontent検査を再実行し、Issue #1129がOPENであることを確認してから、すべてgreenならleaderへ`close-eligible`を引き渡す。

### Fix commitがnon-ancestorだがcontentはclean

`Ancestry=non-ancestor`を記録するが、削除を再適用しない。content cleanと系統未着地を別々に報告し、landing判断へ渡す。

### Contentまたはstructureがred

該当SHA、path、語彙／H2、実測件数、markerの場合はfile:lineを保持して`stop`とする。目視補正、既存green結果の流用、別refへの暗黙切替をしない。

### Main未着地または再検証未完了

engine lifecycleがdoneでもIssue #1129はOPENのままにする。pre-landing `gate-ready`をpost-landing `close-eligible`へ昇格させない。

### 証拠より先にIssueがcloseされている

Landed main再計測前または再計測redの時点でIssue #1129がCLOSEDなら、正常な完了とは扱わず`stop(ordering violation)`として報告する。Issueを再度closeしようとせず、human / leaderへ順序違反とlanded SHAを引き渡す。

### Concurrent branch movement

検証開始後にbranch名や`origin/main`が前進しても、進行中の判定はW1で固定したSHAへ閉じる。新しいheadを評価する場合は新しい`MeasurementRef`と全検査を生成し、旧結果を部分的に混在させない。

## Integration and Error Semantics

統合点はgit object database、対象Markdown、version-controlled intent record、human / leader handoffだけである。`services.md` のとおり同期API・event・queueは追加しない。エラーはすべて回復可能性で分類する。

- ref解決不能、git検査不能: 入力／環境を直して同じstepから全検査を再開する。結果は生成しない。
- marker / H2不一致、証拠不足／non-green、gate拒否／権限失効: expected domain stop。reasonとSHAを返し、landing / closeを許可しない。
- human landing未実施: failureではなくexternal pending。IssueはOPENに保つ。
- landed main再計測不一致: post-landing stop。branchのpre-landing greenで上書きせず、PreLandingEvidenceは保持して新しいlanded main refによる再計測を許す。
- post-landing evidenceより先のIssue close: ordering violation。close-eligibleを生成せずhuman / leaderへ報告する。

## Review

**Verdict:** READY

**Reviewer:** amadeus-architect-agent

**Date:** 2026-07-17T20:28:54Z

**Iteration:** 2

### Findings

| # | Severity | Status | Location | Finding / Recommendation |
|---|---|---|---|---|
| 1 | Major | RESOLVED | W5、BR-8、PreLandingEvidence | §13、green reviews / sensors、approved gate、有効authority、成果物含有pushをadmissibility条件として統一した。 |
| 2 | Major | RESOLVED | Lifecycle states | pre / post landing stopを分離し、PreLandingEvidenceを保持した再計測経路を追加した。 |
| 3 | Major | RESOLVED | W9、BR-10、IssueObservation | Issue OPENをclose eligibilityの必須条件とし、早期CLOSEDをordering violationとして停止する。 |
| 4 | Minor | RESOLVED | W4、AncestryEvidence | W4の出力型を`AncestryEvidence`へ統一した。 |
| 5 | Minor | NEW / non-blocking | `domain-entities.md` `post-landing-stopped` | premature CLOSEDからの復帰にも新しいlanded main refを要求するため、Issue reopenだけで同一refを再評価できない。fail-closed性は維持されるため本unitでは許容し、後続human handoffで新しい観測refを明示する。 |

### Validation Tool Results

- W1〜W9、BR-1〜BR-10: 重複0、未解決参照0。
- Lifecycle states: 8件すべて到達可能、未解決遷移0。
- Upstream coverage: 4成果物すべてconsumes 6/6。
- Scope containment: application code、service、API、AWS、UI追加なし。
