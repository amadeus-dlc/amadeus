# Reliability Design — routing-and-autonomy-guards

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。availability percentageやRTO/RPOを新設せず、decision table、mutation atomicity、read-only advisoryを信頼性境界とする。

## Failure behavior matrix

| Scenario | Required behavior | Blast radius |
|---|---|---|
| age=24h | fresh、non-autonomousだけallow-stop | 当該Stop invocation |
| age=24h+1ms | stale、continue-enforcement | 当該marker decision |
| future mtime | age 0へ丸めfresh | 当該freshness result |
| stat failure/non-finite mtime | unreadable、carve-out拒否 | 当該probe |
| non-autonomous stale unlink成功/失敗 | deleted/delete-failedを区別し、block decision不変 | 当該cleanup |
| autonomous Construction | marker未読、janitor N/A、marker保持、continue-enforcement | 当該Stop invocation |
| doctor probe failure | 他checksを継続しmarker不変 | 当該doctor row |
| autonomous recompose | 全mutation前に拒否し対象bytes不変 | 当該transaction |

## Ordering・atomicity

Stop hookはautonomyを最初に判定する。autonomousならmarker adapterを呼ばず、non-autonomousだけがfreshness→carve-out decision→stale janitorの順で処理する。janitor outcomeはdecisionを変更しない。

recomposeは既存lock内でstate snapshotを読み、最初のdomain guardとして`assertRecomposeAllowed`を呼ぶ。denied時はstate、plan suffix、runtime graph、checkbox、audit entryを一切変更しない。gated/unsetの既存成功経路はstrict validationとtransactional writeを維持する。

## Determinism・observability

同一tokensから3入口で同一help routing、同一stat/nowMs/TTLから同一marker resultを得る。Stop diagnosticはcarve-out decisionとjanitor outcomeを分離し、doctorはabsent行なし、fresh advisory PASS、stale FAIL+remediation、unreadable failureをread-onlyで投影する。

new audit event、metrics、trace、alert、retention、retry、recovery journal、failoverを追加しない。source/projection driftはgenerator checkを非0にしてauthored sourceから修復する。

## Verification design

fake clock/stat/unlink、before/after byte comparison、3入口parity、6 harness projectionをpositive/negative fixtureで固定する。targeted testsとrepository gateを同一最終SHAで実行し、未実施、非0、stale結果をgreenへ読み替えない。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U04-01〜07、`security-requirements.md`のfail-closed/autonomy control、`performance-requirements.md`の単一処理、`scalability-requirements.md`のclosed matrix、`tech-stack-decisions.md`のtest/atomicity、`business-logic-model.md`のFreshness/Janitor/Doctor/Recompose flowへ対応する。
