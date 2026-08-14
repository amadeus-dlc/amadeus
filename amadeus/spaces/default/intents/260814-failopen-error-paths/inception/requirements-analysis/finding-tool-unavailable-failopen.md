# concern(sensors): blocking sensor の tool-unavailable(exit 127)が SENSOR_PASSED となり blocking gate を素通りする(fail-open の残余)

## 背景・対象範囲

sensor dispatcher の真理値表(`packages/framework/core/tools/amadeus-sensor.ts:19-31`、branch b `:643-650`)は、sensor スクリプトが exit 127(コマンド不在)で終了したとき `SENSOR_PASSED` + `Note: tool-unavailable` を emit する。blocking severity の sensor でもこの経路は pass 扱いとなり、Stage 完了ゲート(`amadeus-state.ts` の `evaluateBlockingSensors` `:1932` / `evaluateBlockingSensorGuard` `:2023`)を素通りする。

これは Issue #2988(script-error / bad-output の fail-open)の requirements-analysis(intent `260814-failopen-error-paths`)で射程を裁定した際に**意図的にスコープ外**とした残余である: `tool-unavailable` は「ツール未導入環境で sensor を advisory に倒す」**設計上の寛容ブランチ**であり(`script-error:` 系とは別系統の note)、変更は既存挙動の意図的変更 = 仕様変更に当たるため、#2988 のバグ修正(fail-closed への回復)には同梱しなかった。

## 根拠・実測証拠

- 真理値表 branch b: `amadeus-sensor.ts:643-650` — `if (result.status === 127)` → `kind: "passed"`, `note: "tool-unavailable"`(observed `cd64486a68c6a1144db50fbe3fde8273f5e18455` = 当時の origin/main。RE 記録: `amadeus/spaces/default/codekb/amadeus/re-scans/260814-failopen-error-paths.md`)
- ゲートの pass 判定はイベント名の裸等価(`amadeus-state.ts:1972` / `:1979` — `event === "SENSOR_PASSED"` + receipt 照合)であり、#2988 の修正(shape B: `script-error:` 前置 Note の不通過化)後も `tool-unavailable` は pass のまま
- blocking severity の宣言契約: `amadeus-sensor-schema.ts:35-40` — "'blocking' is consumed by the approval guard — a stage whose blocking sensor has an unresolved FAILED verdict (or never fired at all) cannot be completed."(verbatim)。exit 127 は「実行されたが検証は行われなかった」中間形で、この契約文が名指す2形(FAILED / never fired)のどちらにも該当しない
- shipped の blocking sensor 実例: `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5`(`default_severity: blocking`)— bun が PATH に無い環境等で発火すると exit 127 相当となり、blocking gate が素通りする

## 期待結果・完了条件

- [ ] blocking severity の sensor について、`tool-unavailable`(exit 127)を pass とするか不通過(不明)とするかを設計裁定する(advisory は現状維持が既定)
- [ ] 不通過へ倒す場合: `evaluateBlockingSensors` の述語拡張(#2988 shape B の述語と同型)+ 回帰テスト(既存 fixture `tests/fixtures/v05-mr9-sensor-fire/scripts/amadeus-sensor-stub-127.ts` を再利用可能)
- [ ] pass を維持する場合: 契約文(`amadeus-sensor-schema.ts:35-40`)へ tool-unavailable の免除を明文化し、根拠を記録する

## 影響・価値

blocking sensor は Stage 完了の前提条件であり、実行環境のツール不在が無音のゲート素通りになる。#2988 がスクリプト異常経路を閉じた後、blocking gate に残る既知の fail-open はこの1経路となる。

## 関連 Issue・PR・intent

- #2988(script-error / bad-output の fail-open — 本 concern の発見元)/ #2771・PR #2986(Lifecycle Guard Runtime)/ #2689・#2747(blocking severity 語彙)
- intent: `260814-failopen-error-paths`(requirements-analysis Q3 裁定でスコープ外と確定、ユーザーが起票を承認)

## 初期分類

- 種別: enhancement(設計上の寛容ブランチの意図的変更 — 合意済み契約への違反ではなく、契約の狭間の裁定)/ 優先度: P3
