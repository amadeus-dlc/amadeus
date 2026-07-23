# Scalability Requirements — U2-mirror-skill

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## SC-U2-1: ハーネス数の成長

6ハーネスへの投影は manifest 駆動(coreDirs)— ハーネス追加時は manifest 追加のみで SKILL 側変更ゼロ(canonical 1定義 — ADR-6)。

## SC-U2-2: verb 追加時の影響

将来 verb が増えても SKILL は「status 入口→案内」構造を維持 — 分岐追加は Step 2 の1行追加で済む構造(business-logic-model の Step 構成)。
