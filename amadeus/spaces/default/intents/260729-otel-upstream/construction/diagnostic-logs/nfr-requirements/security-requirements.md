# Security Requirements — U10: diagnostic-logs

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## redaction（二層適用）

| 項目 | 要件 | 根拠 |
|---|---|---|
| export 境界 redaction | diagnostic Log record の属性は U4 の `redaction.ts`（export 境界 policy）通過後の値のみ保存する。redaction で除去された属性は record に残さない | BR-5・BR-7、FR-DST-3 |
| 二層のうち write-time 層 | 呼出し側が write-time redaction を既に通した値であっても、export 境界で再検査する（片層省略の防止） | FR-DST-3（write-time + export 境界の二層） |
| 機微情報の非流入 | prompt・argv・credential・無許可パスを diagnostic Log Store に流さない。`command` 属性の safe-key 見直し・`redactionOptIn` の限定キー許可は U4 の policy 側で担保し、本 Unit は policy を迂回しない | FR-DST-3〜FR-DST-5 |
| 任意 attrs の受理 | `emitDiagnostic` は `Record<string, unknown>` を受理するが、保存対象は redaction 通過後のみ（BR-7）。受理の寛容さを保存の寛容さに転用しない | BR-7 |

## 検証

- credential-free ゲート（VER-2）の検査対象に diagnostic Log Store を含める（audit JSONL・Span/Metric Stores と同列）
- Store 書込失敗時の stderr 相当への出力にも redaction 済み値のみを使い、生 attrs を吐かない（BR-2 の失敗経路も二層の例外にしない）
