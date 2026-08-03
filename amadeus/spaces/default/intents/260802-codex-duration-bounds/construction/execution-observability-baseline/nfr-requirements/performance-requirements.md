# Performance Requirements — execution-observability-baseline

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 性能目標と測定契約

本Unitは [Issue #1602](https://github.com/amadeus-dlc/amadeus/issues/1602) のcontrol baselineを確立する。`requirements.md` NFR-04／FR-08、`business-logic-model.md` のBaselineRun、`business-rules.md` BR-EO-27〜31、`technology-stack.md` の既存benchmark protocolを正準入力とする。providerやhost負荷に左右される絶対実行時間をbaseline取得前にrelease gateへしない。

| ID | 対象 | 定量目標 | 測定・合否 |
|---|---|---|---|
| PR-EO-01 | 固定workload | 同一 `workloadId`／version／input digestでwarmup 3回、測定20回 | observed SHA、harness/model capability、開始・終了条件を各runへ結合し、median／p95／分散を報告する |
| PR-EO-02 | 時間計測 | coreが囲めるattemptの100%を同一monotonic domainで計測 | `measurementQuality=monotonic`。wall fallbackとinvalidを別集計し、invalidを0msへ丸めた場合は不合格 |
| PR-EO-03 | 完全性 | root／child／attemptの100%がterminal、identity参照欠落0件、負duration 0件 | baseline manifestのstatusが`complete`または許容gapだけの`complete-with-gaps`。`invalid`は不合格 |
| PR-EO-04 | canonical event増幅 | lifecycle transition 1件につきcanonical appendは最大1件。再送は0件追加 | 同一idempotency keyのreplay前後でaudit event数を比較し、追加0件を検証 |
| PR-EO-05 | hot path I/O | native開始許可までに外部network I/O 0回、任意sleep／batch flush 0回 | fake exporter／network spyで検証。canonical auditと必須state/runtime projectionだけを同期境界に含める |
| PR-EO-06 | manifest生成 | audit event数を `E` として1 pass、時間O(E)、追加memory O(1)または出力chunk以下 | 1／100／1,000 eventのsynthetic fixtureで走査回数と出力件数が線形であることを検証 |
| PR-EO-07 | 絶対時間budget | Unit 1開始時点では未設定 | 20-run baseline後、同じBoltのevidenceへcontrolのmedian/p95を固定する。根拠なしの共通ms閾値は追加しない |

## Resource Budget と比較手順

- 同じprocess内で可能な比較はcontrol／instrumentedを交互に実行し、別時間窓による系統誤差を避ける。
- filesystem、Bun version、observed SHA、harness、model capabilityが異なるrunを同一母集団へ混ぜない。差分は別cohortとして報告する。
- durationだけでなくattempt数、measurement quality、termination reasonを同時に比較する。時間が短くてもattempt欠落や安全停止なら改善扱いにしない。
- baseline manifestは計測対象runの終了後に一度だけ投影し、各attemptのhot pathで全manifestを書き直さない。
- instrumentation overheadの絶対budgetはbaseline取得後にcontrol差分として定める。後続Unitは同一protocolを使い、比較不能なrunを成功値に含めない。

## 検証証跡

- injectable monotonic clockでclock逆行、片側欠落、domain不一致を再現する。
- fixed workload fixtureでresume／compactは同じroot、Redoはsupersedes付き新rootとなることを確認する。
- `bun test` の実時間sleepではなくfake clockを使い、performance判定をCI負荷から分離する。
- package後の7 harnessとself-install面で同一schemaを読み、Codexだけに異なるperformance gateを設けない。
