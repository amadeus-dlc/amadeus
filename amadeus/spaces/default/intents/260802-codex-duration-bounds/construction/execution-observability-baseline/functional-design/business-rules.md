# Business Rules — execution-observability-baseline

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 適用根拠

`unit-of-work` と `unit-of-work-story-map` の #1602 受入境界、`requirements` FR-01／FR-06／FR-08、`components` C1／C2／C6／C7、`component-methods` の公開method、`services` のharness lifecycle mappingを、このUnitの規則へ変換する。

## Identity 規則

- BR-EO-01: 1 stage instanceは1 root logical operationを持つ。
- BR-EO-02: agent dispatchとtool invocationは独立child operationとし、rootと直接または間接のparentを必須とする。
- BR-EO-03: retryはoperationを維持し、attemptだけを新しくする。
- BR-EO-04: resume／compact／process再起動は同じrootを維持する。Redo／terminal後再実行／reject後revisionは新rootとsupersedes参照を持つ。
- BR-EO-05: canonical IDはC2だけがmintする。adapterのnative IDは追加factでありcanonical IDを代替しない。
- BR-EO-06: IDはopaqueで、prompt、回答、credential、path本文を含めない。

## Transaction と Idempotency 規則

- BR-EO-07: C2はlock内で既存receipt照合、projection fold、ID mint、event appendを行う。
- BR-EO-08: operation／attemptのnative開始許可はcanonical commit receiptと同じevent setのstate/runtime必須projection receiptからC2が`StartPermit`を発行した後だけ成立する。
- BR-EO-09: 同じidempotency keyの再送は既存receiptを返し、counter、attempt、dispatchを重複させない。
- BR-EO-10: `reserved→claimed`は単方向かつ一回だけで、claimed済みreplayはnative dispatchを起動しない。
- BR-EO-11: canonical audit/state writeの安全性を確認できない場合はfail-closedとし、自動retryへ分類しない。
- BR-EO-11A: `claimed`は開始証明ではない。`dispatch-confirmed`前のrecoveryはnative effectを照会し、no-effect-confirmedだけを新attempt候補、unknown／effect possibleを安全停止とする。
- BR-EO-11B: 同じkey・異なるpayload fingerprintは`idempotency-conflict`とし、既存receiptを別payloadへ流用しない。
- BR-EO-11C: canonical commit後も必須state/runtime projection barrierが成功するまでnative開始を許可しない。OTelはbarrierへ含めない。
- BR-EO-11D: C2の`confirmDispatch`だけがnative handle、native受付時刻、開始時刻Factをcommitし、claim時刻を実開始時刻へ流用しない。
- BR-EO-11E: idempotency fingerprintは意味入力、outcome、reasonを含み、観測時刻と計算済みdurationを除外する。finish replayは最初のcommit済みmeasurementを返す。

## Measurement 規則

- BR-EO-12: monotonic clockを優先し、clock sourceとmeasurement qualityを別fieldで保持する。
- BR-EO-13: clock不明、片側時刻欠落、wall逆行は`invalid`であり、durationを0へ補正しない。
- BR-EO-14: unavailable、legacy-unknown、incompleteをavailableへ昇格しない。
- BR-EO-15: model／versionを取得できない場合は`unavailable`として保持し、空文字や推定値を使わない。

## Harness と Gate の規則

- BR-EO-16: 停止・承認・質問の意味論は共有core契約であり、Codex専用gateを作らない。
- BR-EO-17: harness固有差はcapability availabilityとnative fact正規化に閉じ込める。
- BR-EO-18: harness専用分岐を追加できるのは、共有契約で表現不能な再現可能なnative制約があり、capabilityとして明示できる場合だけである。
- BR-EO-19: adapterはpolicy判定、canonical mutation、独自retry昇格を行わない。

## Projection と Privacy の規則

- BR-EO-20: canonical auditを耐久正本とし、state、runtime graph、OTelはprojectionとする。
- BR-EO-21: projection replayはevent identityでidempotentにする。
- BR-EO-22: OTel unavailableはworkflowを止めないが、drop reasonを残す。
- BR-EO-23: telemetryへprompt／answer本文を投影せず、ID、duration、counter、reason、availabilityだけを既存redaction経由で扱う。

## Finish と Baseline の規則

- BR-EO-24: attempt finishは開始済みattemptだけに許し、terminalへの遷移は一度だけとする。
- BR-EO-25: 同じfinish key／同じoutcome fingerprintは既存receiptを返し、異なるoutcomeはconflictとする。
- BR-EO-26: operation正常完了は全child／attempt terminal後だけ許す。安全停止は未終端childをtyped outcomeへ閉じる。
- BR-EO-27: baselineはworkload ID／version、input digest、observed SHA、harness／model／clock capability、開始／終了条件、root ID、root／child／attemptごとのstage／agent／tool origin、measurement、terminationをavailability付きschemaで保持する。
- BR-EO-28: 取得不能なharness／model factを推定せず、availability stateを保持する。
- BR-EO-29: baselineの耐久正本はauditで、manifestは再構築可能な機械可読projectionとする。
- BR-EO-30: 後続比較はworkload ID／version／input digestが一致しなければ拒否する。
- BR-EO-31: `complete-with-gaps`に許す欠測はmodel名/version、harness native version、capability、clock availabilityだけとする。root/workload/input digest/observed SHA/開始・終了条件の欠測、digest不一致、非terminal attemptは`invalid`とする。

## Revision 1 Reconciliation

BR-EO-08/11D/11E/27/31でApplication Designの公開API、key ownership、baseline schemaを閉じ、iteration 2 findingを正準規則へ反映した。

## 検証不変条件

固定workloadのaudit、state、runtime graph、OTelでroot／parent／operation／attemptが一致すること、resumeでrootが変わらないこと、Redoでsupersedes付き新rootになることを検証する。上限値はNFR Requirements以前に固定しない。
