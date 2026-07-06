# Performance Requirements — u003-kanban-hooks

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

QueueHook はローカル追記のみで完了し、ツール実行の体感を悪化させない（N2 = AC-4 の代理基準）。
FlushHook はセッション終了時のみ動き、子プロセスは 60 秒 timeout（BR-10）でセッション終了を止めない。

## 根拠と検証

requirements.md の N2 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は BR-10 の timeout 挙動と「QueueHook がネットワーク・child process を持たない」ことの TDD で行う（business-rules.md「検証の分担」）。
