# Security Design — u003-kanban-hooks

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

hook はネットワークを持たず（C05）、書き込み値は dirName と定型理由文字列に限る（書式テストで固定）。子プロセスの認証は U002 と同じ gh CLI 委譲。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
