# Reliability Design — u002-kanban-sync-cli

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

冪等性の設計は「タイトル索引 → 全フィールド上書き」（D-AD3、BR-2）で実現する。部分失敗は非 0 exit で明示し、再実行で収束する。worktree 退行防止は --dirs 部分 sync + --all の worktree 拒否（BR-7、D-AD7 改訂 / D-AD11）で担保する。鮮度は Synced At（BR-6）。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
