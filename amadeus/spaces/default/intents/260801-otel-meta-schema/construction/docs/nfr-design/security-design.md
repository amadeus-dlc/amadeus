# Security Design — U6 docs

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ面は project.md Mandated(export-boundary-redaction — 文書化対象としての二層 redaction)から代替導出。business-logic-model.md(実在)の生成フロー・乖離解消の決定木を消費(Redaction layers 節を含む節構成の正本は FD domain-entities.md:9-16)。

## 文書自体の情報統制

- 新章に実環境の実データ(実 intent 名・実パス・実 token 値)を例として貼らない — 例はすべて合成値(`<home>/...` 等のマスク後形式)で書く。スキーマ文書が redaction 前の生値の見本を提供してしまう自己矛盾を避ける
- 認証情報・API キー類は文書に一切含まれない(静的 markdown のみ)

## 統制の文書化責務

- 二層 redaction(write-time+export 境界)と path マスク3分類を新章の Redaction layers 節で正確に記述する — 文書が実装の統制と乖離すると利用者が誤った安全性期待を持つため、乖離解消の決定木(FD — docs 独自吸収禁止・#1868 改訂経由)を統制の一部として運用する
