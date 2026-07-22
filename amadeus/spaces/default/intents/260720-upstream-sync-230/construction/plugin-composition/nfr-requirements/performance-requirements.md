# Performance Requirements — plugin-composition

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。invocation-local inspect/plan/apply/dropであり、service latency/throughput SLOは追加しない。

## 有界処理要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U10-01 | `inspectPlugin`はsame-name、malformed、unknown seam、clobberを決定順で全数検査してからready/rejectedを返す。 | first-errorによる診断欠落0。 |
| PERF-U10-02 | planはno-clobber copy、4 seam merge、宣言fragment、shared contributionだけを対象にする。 | 暗黙seam/対象外走査0。 |
| PERF-U10-03 | apply/dropはtemp hostで一回のcompile・sensor/doctor検証後だけcanonical commitへ進む。 | canonical逐次試行write 0。 |
| PERF-U10-04 | recoveryはworkspace lock取得直後、未完了journalに対して新規操作より先に実行する。 | recovery中compose/drop 0。 |

新parallelism、cache、retry、batch、scan time thresholdを追加しない。順序、対象、回復境界はBR-U10-01〜22とE-USSU10FD1/2をそのまま使用する。

## Verification gate

targeted inspect/compose/drop/shared-contribution/crash-boundary testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。push前local lcov patch追加行未カバー0、spawn seam、既決waiver証拠条件を満たす。

## トレーサビリティ

PERF-U10-01〜04は`business-rules.md`のBR-U10-01〜22、`business-logic-model.md`のInspect/Atomic workflows、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:46:01Z`
- Verdict: **NOT-READY**
- Scope decision: **none**
- Severity: **CRITICAL 1 / MAJOR 0 / MINOR 0**

### Findings

1. **CRITICAL — `COMMITTED`後までpre-state recovery対象にしており、durable commit意味論と衝突する。** `reliability-requirements.md`のCrash/failure fixture matrixは、`COMMITTED`前後を含む「各点」で次操作前recoveryとpre-state収束を要求する。一方、REL-U10-03、BR-U10-20、E-USSU10FD2は、全三面完了後だけ`COMMITTED`へ進み、record/auditを一度だけ成立させる。durableな`COMMITTED`後のcrashでpre-stateへ戻すと、成立済みcompose/dropを次操作が消去し、同文書内のvalid transaction契約を破る。`PREPARED`のままのcrashはpre-stateへ冪等回復し、durable `COMMITTED`後のcrashはpost-state・record・audit onceを維持してpre-state recoveryを行わない、という既決phase境界へfixtureを分割すること。これは新しいrecovery分岐の追加ではなく、既決`PREPARED`/`COMMITTED`意味論の復元である。

### Confirmed checks

- BR-U10-01〜22、正準6 public seam、内部`discoverPlugins`、全error収集とerror時write 0は一致する。
- no-clobber、4 seam merge、declared fragment、temp treeでのcompile/sensorまたはcompile/doctor後だけcanonical commitする境界は実装可能である。
- E-USSU10FD1のbase/precondition、canonical contribution、適用順、期待post-state、shared file全体ownership禁止、current一致のmutation前検証、残存寄与の決定的再構築、drift時三面不変が反映されている。
- E-USSU10FD2のworkspace lock、全三面write-set/preimage、mutation前`PREPARED`、三面完了後`COMMITTED`、handled failure即時復元、未回復中操作禁止、drift/corruption時追加mutation 0が反映されている。findingはpost-`COMMITTED` fixtureの一文に限定される。
- `PREPARED`直後、host各write後、record write後、audit write前後、`COMMITTED`前後のfailure/crash point自体は全数列挙されている。
- NFR-5のtargeted testsとfull CI gate、NFR-6のpatch追加行未カバー0、spawn seam、既決waiver条件が明記されている。
- 新failure分類、journal format、retry、atomicity、drop ownership、SLO、public APIは追加されていない。

### Sensor results

- **11/11 PASS**: `required-sections` 5/5、`upstream-coverage` 5/5、`answer-evidence` 1/1。
- `linter` / `type-check`: 対象となるTypeScript/JavaScriptコード成果物なし。

## Review — Iteration 2

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:47:49Z`
- Verdict: **READY**
- Scope decision: **none**
- Severity: **CRITICAL 0 / MAJOR 0 / MINOR 0**

### Iteration 1 finding disposition

1. **RESOLVED — `PREPARED`とdurable `COMMITTED`のcrash recovery境界。** 未完了`PREPARED`中のcrash pointは次操作前にpre-stateへ冪等回復し、回復完了まで新規compose/dropを禁止し、二重record/auditを0とする。一方、全三面完了後のdurable `COMMITTED`直後はpost-state、record、audit onceを維持し、pre-state recoveryを行わない。questions、SEC-U10-04、REL-U10-03/05/06、crash fixture matrixが同じphase意味論へ揃い、成立済みtransactionをrollbackする矛盾は解消した。

### Architecture checks

- 未完了phaseのfixtureは`PREPARED`直後、host各write後、record write後、audit write前後、`COMMITTED`直前を覆い、pre-state収束、未回復中操作禁止、二重record/audit 0を検証する。
- durable `COMMITTED`直後の独立fixtureはpost-state、record、audit onceの維持とpre-state recovery 0を検証する。
- BR-U10-01〜22、正準6 public seamと内部`discoverPlugins`、shared contribution ownership、current/precondition/post-state検証、残存寄与の決定的再構築、drift/corruption時追加mutation 0は変更されていない。
- 新failure分類、recovery分岐、journal format、retry、atomicity、drop ownership、SLO、public APIは追加されていない。今回の是正はE-USSU10FD2の既決phase境界の復元に限定される。

### Sensor results

- 影響範囲: **5/5 PASS** — `required-sections` 2/2、`upstream-coverage` 2/2、`answer-evidence` 1/1。
- 全体最終: **11/11 PASS** — `required-sections` 5/5、`upstream-coverage` 5/5、`answer-evidence` 1/1。
- `linter` / `type-check`: 対象となるTypeScript/JavaScriptコード成果物なし。
