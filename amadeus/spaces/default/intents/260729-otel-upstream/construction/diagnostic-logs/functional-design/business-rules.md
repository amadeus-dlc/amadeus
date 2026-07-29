# Business Rules — U10: diagnostic-logs

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: diagnostic Log は diagnostic Log Store（machine-local JSONL）にのみ保存される。AuditLogExporter および audit JSONL（Journal）への混入はいかなる経路でも禁止する（FR-EXP-4）
- BR-2: diagnostic Log の emit・保存で発生した失敗は必ず fail-open とする。例外を呼出し側へ伝播させず、fatal latch を set せず、workflow を停止させない（FR-EVT-6）
- BR-3: active Context が存在する限り、すべての diagnostic Log record は traceId／spanId を含む（FR-MLM-2）。相関情報の剥がしは許容しない
- BR-4: diagnostic 経路は canonical 経路の状態に影響しない。emit の成否にかかわらず latch・sequence・idempotency 記録を読み書きしない（FR-EVT-4 と整合）
- BR-5: record の属性は export 境界の redaction policy（U4 の `redaction.ts`）を通過したもののみ保存する。機微情報（prompt・argv・credential・無許可パス）を Log Store へ流さない（FR-DST-3 と整合）

## 検証ルール（validation）

- BR-6: `emitDiagnostic` の name は Event Registry（U2）の canonical 語彙と一致してはならない。一致する name の利用は分類境界の誤用として drift guard 系の検査で拒否する（FR-EXP-4／FR-EVT-1 と整合）
- BR-7: `emitDiagnostic` は任意の attrs 形状を受理するが（型上は `Record<string, unknown>`）、保存対象は redaction 通過後の値のみとする。redaction で除去された属性は record に残さない（BR-5 の帰結）
- BR-8: emit 完了時に同一 process の reader から当該 record を観測できる（同期 append、batch timer・flush なし。FR-JRN-3 の Store 版として扱う）

## 条件付き振る舞い

- BR-9: Span 非アクティブ時の emit では traceId／spanId を欠落させてよいが、record 自体は保存する。欠落は異常として扱わない（FR-MLM-2 の fail-open 補則）
- BR-10: LocalLogExporter の保存が失敗した場合、失敗を記録する二次的な emit は行わない（再帰的失敗の防止。BR-2 の帰結）
- BR-11: diagnostic Log の保存は U4 で hardening 済みの LocalLogExporter を利用する。本 Unit で Exporter 実装を複製・改変しない（unit-of-work.md の依存宣言どおり）
- BR-12: Relay（U11）への OTLP 変換・送信で Collector が停止していても、Store への保存済み record と workflow 結果は影響を受けない（FR-RLY-3 と整合。本 Unit の保存責務の耐性条件）

## canonical 経路との対比（FR-EXP-4 の境界確認）

分離がどこで強制されるかを canonical（U1/U4 所有）との対比で固定する。右列が本 Unit の振る舞い。

| 観点 | canonical Event（参考） | diagnostic Log（本 Unit） |
|---|---|---|
| emit Interface | `emitEvent` | `emitDiagnostic` |
| dispatch 先 | AuditLogExporter（同期、Span 終了を待たない） | LocalLogExporter（同期） |
| 保存先 | audit JSONL（Journal） | diagnostic Log Store（別ストア） |
| 失敗時 | 同期例外＋fatal latch set（FR-EVT-3） | fail-open（BR-2） |
| workflow への影響 | mutation 拒否へ連動（FR-EVT-4） | 一切影響しない（BR-4） |
| 相関 | Journal record が trace/span IDs を持つ | traceId／spanId で相関（BR-3） |

本 Unit の責務は右列の成立と、左列への非混入（BR-1・BR-6）のみであり、canonical 経路自体の契約は本 Unit では変更しない。

