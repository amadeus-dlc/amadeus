# Steering Layer

## 役割

この layer は、Amadeus の使い方を示す例示 workspace 全体の前提を扱います。

## 対象成果物

- [objective.md](steering/objective.md)
- [product.md](steering/product.md)
- [tech.md](steering/tech.md)
- [structure.md](steering/structure.md)
- [actors.md](steering/actors.md)
- [external-systems.md](steering/external-systems.md)
- [glossary.md](glossary.md)
- [knowledge.md](steering/knowledge.md)
- [knowledge/](steering/knowledge/)
- [policies.md](steering/policies.md)
- [policies/](steering/policies/)
- [domain/subdomains.md](domain/subdomains.md)
- [domain/bounded-contexts.md](domain/bounded-contexts.md)
- [discoveries.md](discoveries.md)
- [intents.md](intents.md)

## 読む順序

1. 目的、プロダクト、技術、構造を読む。
2. アクター、外部システム、制約、既知の知識を読む。
3. Discovery 一覧で入力テーマの分解状態を読む。
4. Intent 一覧で初期化済み Intent を読む。

## Intent Layer へ進む基準

Discovery で Intent 候補が整理され、最初に進める候補が1件に決まった場合に Intent Layer へ進みます。

## 責務境界

Steering layer は個別 Intent の Requirement、Use Case、Unit、Bolt、Task を作りません。
