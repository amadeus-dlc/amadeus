# Code Generation Plan — guide-ops

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施計画と実施結果

| # | 作業 | 実施方法 | 結果 |
|---|---|---|---|
| 1 | 06-agents + 07-interaction-modes（英日 4 ファイル） | subagent A（amadeus-developer-agent）→ conductor が #541 純正性検証 | 完了（H2 対 6/6・5/5、14 agents と 4 択の台帳一致を subagent 自己検証 + conductor 再確認） |
| 2 | 12-cli-commands（英日 2 ファイル） | subagent B → 同上 | 完了（help 全 50 行を 5 block に分割掲載、diff 照合で無改変を確認） |
| 3 | index 対の更新（3 行ずつ） | conductor が直接実施（予定一覧 → 上部テーブルへ移動、設計どおり） | 完了 |
| 4 | リンク機械検査（NFR-5） | checker を新章 6 ファイルへ拡張して実行 | checked=198 broken=0 |
| 5 | コミット（BR-7 = 章対単位） | 06 対 / 07 対 / 12 対 / index 対の 4 コミット | 完了 |
| 6 | Codex 初見読者レビュー（NFR-4） | reviewer へ依頼済み | 実施中 → 結果は code-summary.md に記録 |
