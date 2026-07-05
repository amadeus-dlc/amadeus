# Security Design — u002-kanban-sync-cli

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

認証は gh CLI へ全面委譲し、コードはトークンに触れない。エラーメッセージは自前の定型文 + gh の stderr 要約とし、レスポンス本文を生で出力しない（秘匿値混入の回避）。書き込み前検証（scope、project 解決）で部分状態を作らない（BR-8）。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
