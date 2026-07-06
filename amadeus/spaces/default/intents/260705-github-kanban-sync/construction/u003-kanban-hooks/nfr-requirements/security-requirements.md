# Security Requirements — u003-kanban-hooks

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

QueueHook はネットワークを持たない（C05）。FlushHook のネットワークは子プロセス（U002 CLI）経由だけであり、認証も U002 と同じ gh CLI に依存する。queue / drops.log に書くのは dirName と理由文字列だけで、秘匿値を含めない（検証: drops.log / queue の書式テストで、書き込まれる値が dirName と定型理由文字列に限られることを確認する。business-rules.md「検証の分担」に対応を追加済み）。

## 根拠と検証

requirements.md の C05 系制約を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は queue / drops.log の書式テストと「ネットワーク呼び出し不在」の TDD で行う。
