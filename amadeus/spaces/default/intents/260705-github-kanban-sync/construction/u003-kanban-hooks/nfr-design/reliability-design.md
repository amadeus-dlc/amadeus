# Reliability Design — u003-kanban-hooks

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

搬送の信頼性は rename 専有（BR-9）、孤立 queue.processing の起動時回収（flow step 0.5）、失敗時の行単位 append 戻し、drops.log 記録（BR-4 / BR-5）で構成する。hook は常に exit 0 とし、セッション終了を阻害しない。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
