# Security Requirements — execution-observability-baseline

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Data Protection と Privacy

`requirements.md` NFR-03、`business-logic-model.md` のopaque identity／BaselineManifest、`business-rules.md` BR-EO-06／23、`technology-stack.md` の既存local OTel／audit構成を適用する。本Unitは認証境界やremote collectorを新設せず、既存のローカルworkspace権限を継承する。

| ID | 資産・脅威 | 必須要件 | 検証 |
|---|---|---|---|
| SR-EO-01 | prompt／回答漏えい | prompt本文、回答本文、会話本文をaudit、runtime graph、OTel、baseline manifestへ0件保存 | sentinel secretを含むfixtureで全投影を走査し0 hit |
| SR-EO-02 | credential漏えい | token、cookie、authorization header、env secret、GitHub credentialを0件保存 |既存redaction contractのpositive／negative fixtureを全sinkへ適用 |
| SR-EO-03 | IDへの情報埋込み | operation／attempt／reservation IDはopaqueで、path、user入力、agent promptを可逆に含めない | ID生成器の入力型にcontent fieldがないことと100件のschema conformanceを検証 |
| SR-EO-04 | path／入力露出 | workload入力はcanonical digestだけを保存し、生のfile content／absolute pathは保存しない | manifest schema snapshotとsecret-bearing path fixtureを検証 |
| SR-EO-05 | telemetry egress | exporter未設定時のnetwork egressは0回。remote exportは既存の明示設定とredaction境界だけで許可 | network spyと設定なしjourneyで0 call |
| SR-EO-06 | canonical改ざん | adapterはcanonical ID、duration、termination reasonを上書きできない | adapterが競合factを返すnegative conformanceでcore拒否 |
| SR-EO-07 | supply chain | 新規runtime／development dependency 0件 | `package.json`／lockfileの意図しない依存差分0、既存Bun/TypeScript/OTelだけを使用 |

## Threat Model と Trust Boundaries

- **Spoofing**: harness native IDは`Fact`でありcanonical primary keyにしない。canonical IDはC2だけがmintする。
- **Tampering**: canonical auditを正本とし、state/runtime/OTelから正本へ逆書込みしない。同一idempotency keyでpayload fingerprintが違う要求はfail-closedとする。
- **Repudiation**: root／parent／operation／attempt、observed SHA、termination reasonを同じevent chainで保持し、欠測を`unavailable`として明示する。
- **Information disclosure**: execution originはstage slug、agent role、tool nameの許可されたmetadataだけに限定し、argvやpromptをoriginへ流用しない。
- **Denial of service**: OTel exporter failureはworkflowを拘束しない。必須projection failureはnative開始前に止め、再帰的な失敗event投影を行わない。
- **Elevation of privilege**: 本Unitはpermission、approval、gate semanticsを変更しない。Codex専用gateやadapter独自の開始許可を追加しない。

## Compliance と Retention

- 想定データ分類はoperational metadataであり、規制対象個人情報を必要としない。取得不能なmodel／harness factを推測して補完しない。
- baseline manifestはcanonical auditの再構築可能projectionとして、audit recordと同じworkspace／version-control policyへ従う。独自retention、database、cloud storageを追加しない。
- telemetryを外部へ送る構成では既存redactionと利用者の明示設定を必須とし、設定がない場合はlocal-onlyを維持する。
- security conformanceは全supported harnessに共通で、Codexで観測が顕著という理由だけの例外を認めない。
