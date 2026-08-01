# Scalability Design — U6 docs

上流入力(consumes 全数): scalability-requirements ほか performance-requirements / security-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 本 unit は docs 専業のため runtime スケーラビリティは N/A(反証可能な根拠: unit-of-work.md U6 行にコード按分ゼロ)。文書生成フロー(en+ja 同一 PR)は business-logic-model.md(実在)から、新章の節構成は FD 正本テーブル(domain-entities.md:9-16)から導出。

## 文書構造の拡張性

- 新章の節構成は FD 正本テーブル(domain-entities.md)の6節 — **Resource attributes / Span attributes / Exception events / Subagent observability / Metrics instruments / Redaction layers** — に1:1 で従う(#1868 §3 の Log 面はスコープ外・無改変のため節を設けない — scope-document 既決)。スキーマ v2 での面追加は節追加で吸収でき、既存節の改編を要しない(additive な文書構造)
- 属性表は「名前/型/供給元/省略条件」の4列固定 — 属性追加は行追加のみで、列設計の変更を伴わない
- count-free 原則(c3-adjacent-enum-numerals)により、スキーマ拡張時に散文の件数語が陳腐化する面を構造的に持たない

## 対訳ペアのスケール

- en/ja ペアは既存 22/22 慣行に+1ペア — ペア数の増加は t174 系検査の走査対象増のみで、同期コストは乖離解消の決定木(#1868 改訂経由の一方向同期)で統制される
