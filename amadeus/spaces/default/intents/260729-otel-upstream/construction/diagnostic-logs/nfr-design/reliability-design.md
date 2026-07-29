# Reliability Design — U10: diagnostic-logs

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（fail-open・trace 相関の正確性）に対する設計。

## fail-open の設計

- Store 書込失敗時、例外を呼出し側へ伝播させない。fatal latch を set せず、workflow を停止しない（BR-2、FR-EVT-6）。Exporter は失敗を catch して即時 return し、失敗の事実は可能な範囲で stderr 相当へ落とす
- 保存失敗を記録する二次的 emit を行わない（再帰失敗の防止、BR-10）。強制失敗テストで二次 emit ゼロを固定
- emit 成否にかかわらず latch・sequence・idempotency 記録を読み書きしない（canonical への非影響、BR-4、FR-EVT-4 整合）
- Relay（U11）の OTLP 送信が Collector 停止で失敗しても、Store 保存済み record と workflow 結果は影響を受けない（BR-12、FR-RLY-3 整合）

## trace 相関の設計

- active Context 存在時、全 record が traceId／spanId を含む。相関の剥がし（emit 経路での IDs 削除）を禁止する（BR-3、FR-MLM-2）
- Context なしでは IDs を欠落させてよいが record は保存する。欠落を異常とみなさず、canonical 経路の異常ともみなさない（BR-9）
- 子 process（U5 の W3C 伝播経由）で emit した Log が親と同じ traceId を持つことを子 process 起動テストで固定する

## routing 境界の設計

- 分類の判断は Logger Provider 内部の単一点に集約し、`emitEvent`（canonical）と `emitDiagnostic`（telemetry）は公開 Interface から別経路で相互に record を共有しない（business-logic-model.md § 振り分けの境界）
- `emitDiagnostic` が AuditLogExporter／audit JSONL に一切 dispatch しないことを振り分けテストで拒否する。canonical 語彙との name 一致は誤用として拒否（BR-1/BR-6、FR-EXP-4）
- 検証順序は VER-3 のテスト先行: fail-open・相関・振り分けの拒否テストを red として先行し、同一コミットで green とする
