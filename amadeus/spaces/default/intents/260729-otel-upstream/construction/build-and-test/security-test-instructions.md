# セキュリティテスト手順(security-test-instructions)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — セキュリティ検査は承認済み NFR(redaction 二層・provenance・fail-closed ゲート)へ trace できる範囲のみ生成した(bt-proportional-selection)。

## 対象と実行

```
bash tests/run-tests.sh --ci        # 以下を包含
```

- **redaction 二層**(export-boundary-redaction Mandate): 書込時+送出境界(Local Exporter / OTLP Relay)の redaction filter — Relay 系テスト(t372/t375)と exporter テストで検証
- **credential scrub**: subprocess span name の `scrubCredentials`(t384 系)
- **監査完全性**: append-only 契約・withAuditLock 直列化・presence/provenance ガード(t361/t365-kimi/t-solo-gate-transaction-prefix)
- **ゲートの fail-closed**: 削除ゲート UNKNOWN≠PASS(BR-12)、callsite-guard shrink-only、census 注入シームは argv 非公開(builder 逸脱2として受理済み)

## 依存監査

対象 tests green と repository 全体 dependency audit は別判定(c1-doctor-seam)。本 intent は依存追加ゼロ(@opentelemetry 依存もゼロ、vendored API のみ)。
