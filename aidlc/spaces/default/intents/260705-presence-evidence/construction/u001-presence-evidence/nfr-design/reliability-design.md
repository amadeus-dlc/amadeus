# Reliability Design — u001-presence-evidence（260705-presence-evidence）

上流入力: [reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[business-rules.md](../functional-design/business-rules.md)、[risk-and-sequencing-rationale.md](../../../inception/delivery-planning/risk-and-sequencing-rationale.md)

## inception リスク対応からの変更

delivery-planning の R-3 縮退版（「衝突時は union」）は、その後のピア協議（engineer1 の回答 00:30:52Z と訂正 00:32:15Z）により「#428 merge まで対象 2 ファイルへの実書き込みを待つ」タイミング規律（BR-7）へ変更された。inception 成果物は書き換えず、変更は decision（00:34:53Z）と本設計で追跡する。

## 設計

| 要求 | 設計 |
|---|---|
| REL-1（ドリフト防止） | 執筆手順に「amadeus-state.ts の verifyDocsOnlyEvidence を開いて検査ステップを列挙 → 文書の記述と突き合わせ → code-summary に再読了の記録（行番号付き）」を組み込む |
| REL-2（タイミング規律 = BR-7） | 下書きは record 成果物（boundary-section-draft.md）に隔離。対象 2 ファイルへの反映 commit は #428 merge 一報の後にのみ作成（commit 履歴で検証可能） |
