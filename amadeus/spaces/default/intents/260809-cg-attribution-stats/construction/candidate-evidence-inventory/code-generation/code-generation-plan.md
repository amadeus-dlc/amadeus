# Code Generation Plan — candidate-evidence-inventory

## 方針

U-02 は U-01 の domain contract と既存 journal/event contract を利用する pure library である。attribution-only corpus view、9 candidate family の closed classification、Event Set envelope の integrity 検証、explicit evidence による lifecycle grouping だけを所有する。legacy measured branch、interval accounting、statistics、renderer、filesystem、writer、generated surfaceは変更しない。User Stories stage は scope 上生成されていないため、`requirements.md`、`unit-of-work.md`、Functional Design、NFR Design へ代替 trace する。Depth は Standard、Test Strategy は Comprehensive である。

## 実装チェックリスト

- [x] Step 1: `amadeus-stage-attribution-candidates.ts` に入力非破壊の attribution corpus projection と canonical wire dedup を実装する。
- [x] Step 2: exact Event Set、6 prefix family、transaction envelope を重複なく9 familyへ分類し、未知 prefix memberを evidence-only として保持する。
- [x] Step 3: Event Set を payload、JSON/object、schema、digest、ID、inner event の安全な順でdecodeし、検証可能なfindingを全て保持する。
- [x] Step 4: invocation-local の Event Set ID indexを第2 passで構築し、collisionに関係する全outer outcomeへfindingを付与する。inner件数を推定せず、decode不能outerは1 candidateだけをrejectする。
- [x] Step 5: explicit intent、explicit stage、family、lifecycle identity/source fallbackでgroup化し、window containmentやtimestamp近接による補完を禁止する。
- [x] Step 6: start/terminal cardinality、UTC integer-second timestamp、positive intervalを検証し、全findingへU-01の固定precedenceを1回だけ適用する。
- [x] Step 7: candidate groupをacceptedまたはrejectedへちょうど1回写像し、primary reason以外をsecondary diagnosticsへ保持する。
- [x] Step 8: `t486-stage-attribution-candidates.test.ts` に9 family、dedup、複合finding、Event Set collision、explicit evidence、順序不変、入力非破壊のfocused testを実装する。
- [x] Step 9: focused test、repository typecheck、lintを実行し、所有source/testだけをConventional Commitにする。

## 要件トレーサビリティ

| Step | 要件・設計契約 | 期待証拠 |
|---|---|---|
| 1、2 | FR-POP-1/3、FR-EVT-1、BR-CAN-01〜04 | 9 family census、canonical duplicate fixture、non-candidate非干渉 |
| 3、4 | FR-EVT-2/5、Event Set rules | malformed outer 1件、schema+digest複合finding、duplicate ID全outer rejection |
| 5、6 | FR-EVT-3/4、explicit evidence/lifecycle rules | missing/mismatch分離、stage再利用非干渉、cardinality/timestamp境界test |
| 7 | FR-EVT-5、FR-OUT-3 | accepted/rejected全単射、primary/secondary precedence permutation |
| 8、9 | FR-TEST-1〜2、NFR-1〜3/5〜7のcandidate側 | table-driven test、shuffle、snapshot、typecheck、lint |

U-02 は candidate inventory の supporting slice のみを実装する。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10は U-01〜U-04 と Build and Test の全体 mappingを維持し、U-03のinterval accountingとU-04のservice/report責務を削減・先取りしない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T03:00:52Z
- **Iteration:** 1
- **Scope decision:** none

9 family、FR-POP/FR-OUT/NFRのUnit分担、全outer collision第2 pass、finding集合への固定precedence、explicit intent/stage、one group one outcomeはplan・summary・accepted design間で追跡でき、PR未作成もnot-applicable-yet/converged=falseとしてPASSの代用にしていない。一方、unit-pool等のschema/digest非保有wireを受理する実装判断は、現行evidenceを推定しない安全方針としては妥当でも、accepted requirements/designが要求するEvent Set integrity検証のfamily別例外として未定義であり、U-02完了判定には契約差分が残る。

### Findings

- BLOCKER | FR-EVT-2は少なくともtransaction・execution・unit-pool outer envelopeのschema、digest、event-set identity、inner lifecycle field検証を要求し、Business Logic／Business Rules／Security Designもsupported schemaとdigest検証をfamily別例外なしで規定している。対してcode-summary.mdは、共通schema discriminatorがないfamilyを現行wire shapeだけでsupported schemaとみなし、declared digestがないunit-pool/loop-monitorではdigest検証を行わないという新しい受理条件を導入している。「存在しないdigestを推定しない」こと自体は正しいが、それだけでは、integrity evidence欠落をmalformedとしてfail-closedにするのか、family固有contractとして受理するのかをaccepted artifactから一意に決められない。familyごとのschema識別方法、digestの必須／任意、欠落時のcandidate disposition、対応test期待値をFunctional DesignまたはRequirementsに明示して承認するか、現契約どおり欠落をfail-closedにするまでU-02はREADYにできない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T03:15:28Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のBLOCKERはscope縮小なしで解消された。executionはembedded/outer digest、unit-pool/loop-monitorは必須outer digest、Intent Autonomy transactionはschema・ID・inner・digestを検証し、digest欠落・不一致・unsupported innerをfail-closedにしてdecode不能outerを各1件rejectする。Quality Repair/Intent Completionもtransaction-level digest欠落を理由に黙って除外せずouter単位で計上するため、FR-EVT-2のintegrity検証、FR-EVT-5の固定precedence・outer failure計数、全9 familyのobserved=accepted+rejected契約と整合する。focused・統合test、typecheck、lint、referee evidenceも修正境界を裏付け、PR未作成状態もPASSへ代用していない。

### Findings

- None
