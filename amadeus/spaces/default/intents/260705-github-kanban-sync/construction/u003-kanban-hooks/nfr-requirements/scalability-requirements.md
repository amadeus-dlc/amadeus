# Scalability Requirements — u003-kanban-hooks

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

queue は追記型テキストで、1 セッションあたり高々数十行。flush 側で uniq するため肥大は起きない（実装観察に基づく見込み）。スケール専用の要求・機構は追加しない。これは N3（軽量実装 = 統計・通知・リトライを作り込まない）の適用である。

## 根拠と検証

スケール要求は設けないという判断の記録であり、新しい NFR は追加しない（暫定機構 C07 / N3）。検証対象はない。
