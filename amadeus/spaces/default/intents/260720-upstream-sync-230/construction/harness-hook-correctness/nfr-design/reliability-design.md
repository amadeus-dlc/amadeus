# Reliability Design — harness-hook-correctness

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。新retry、circuit breaker、journal、failoverを追加せず、既存hook contractの正しいfailure投影を設計する。

## Failure behavior matrix

| Failure | Required behavior | Blast radius |
|---|---|---|
| child non-zero/signal | `SpawnResult`でstdout/stderr/cwd/exitとともに既存契約どおり返す | 当該hook invocationのみ |
| malformed/empty Kiro payload | payload依存targetはadvisory no-op、推測mutation0 | 当該payload依存処理のみ |
| failed/unknown tool result | artifact eventへ昇格せずvisible drop | 当該tool eventのみ |
| payload-free target | audit-tail self-gateでruntime compile/state sync継続 | 既存transition guard内 |
| sensor/advisory failure | audit-first記録後、既存fail-open contractを維持 | downstream advisoryのみ |
| debug write failure | 通常hook処理とdebug-off stdoutを維持 | optional debug fileのみ |
| source/projection drift | generator checkを非0にし、sourceを正とする | package/promote gate |
| Claude parse/quote/path failure | 生成前またはtestでloud failure | settings projectionのみ |

## Ordering・state safety

Kiro success writeは同一canonical payloadをaudit hook、次にsensor hookへ渡す。audit記録が成立しない状態をsensor成功だけで全体成功へ読み替えない。state syncはaudit tailの最新未完了`STAGE_STARTED`だけをforward-onlyに反映し、completed/skipped/parkedを巻き戻さない。

runtime compileはIDE専用source markerを既存core transition/idempotency guardへ渡す。U07で新しいrecovery stateやjournalを持たず、同一event再処理の意味は既存guardへ委譲する。

## Debug・observability

debugは既存環境変数またはworkspace markerによる明示opt-inだけでappendし、通常stdoutと分離する。観測面は既存audit、visible drop、debug、test evidenceに限定し、新metrics backend、trace collector、alert、retentionを追加しない。

## Verification design

PATH除去、stdin未close、failed tool、unknown wording、identity marker有無、payload absence/malformed、空白project path、11 command、6 projection drift、statusline/permission bytes不変をpositive/negative fixtureで固定する。全repository gateとpatch coverageを同一最終SHAで確認する。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U07系scenario、`security-requirements.md`のfail-closed、`performance-requirements.md`のsingle invocation、`scalability-requirements.md`の全数matrix、`tech-stack-decisions.md`の既存test stack、`business-logic-model.md`のFailure decisionsへ対応する。
