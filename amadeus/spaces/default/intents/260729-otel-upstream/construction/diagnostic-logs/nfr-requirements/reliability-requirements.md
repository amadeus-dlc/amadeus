# Reliability Requirements — U10: diagnostic-logs

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## fail-open（store never blocks workflow）

| 項目 | 要件 | 検証 |
|---|---|---|
| 例外の非伝播 | Store 書込失敗時、例外を呼出し側へ伝播させない。fatal latch を set せず、workflow を停止しない | 強制失敗テスト（BR-2、FR-EVT-6） |
| 再帰失敗の防止 | 保存失敗を記録する二次的 emit を行わない。失敗の事実は可能な範囲で stderr 相当へ落とすに留める | 強制失敗テストで二次 emit ゼロを固定（BR-10） |
| canonical への非影響 | emit 成否にかかわらず latch・sequence・idempotency 記録を読み書きしない | BR-4（FR-EVT-4 整合）、テストで拒否 |
| Collector 停止耐性 | Relay（U11）の OTLP 送信が Collector 停止で失敗しても、Store 保存済み record と workflow 結果は影響を受けない | BR-12（FR-RLY-3 整合） |

## trace 相関の正確性

| 項目 | 要件 | 検証 |
|---|---|---|
| 相関の完全性 | active Context 存在時、全 record が traceId／spanId を含む。相関の剥がし禁止 | `startActiveSpan` 内 emit の相関テスト（BR-3、FR-MLM-2） |
| 非アクティブ時 | Context なしでは IDs を欠落させてよいが record は保存する。欠落を異常とみなさない | BR-9 のテスト固定 |
| process 横断相関 | 子 process（U5 の W3C 伝播経由）で emit した Log が親と同じ traceId を持つ | 子 process 起動テスト |
| routing 境界 | `emitDiagnostic` が AuditLogExporter／audit JSONL に一切 dispatch しない。canonical 語彙との name 一致は誤用として拒否 | 振り分けテスト（BR-1・BR-6、FR-EXP-4） |

## 検証順序

- VER-3 のテスト先行に従い、fail-open・相関・振り分けの拒否テストを red として先行し、同一コミットで green とする
