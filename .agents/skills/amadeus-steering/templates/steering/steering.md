# Steering

## 役割

- `<product-name>` の Amadeus 成果物で共有する目的、方針、知識、用語、アクター、外部システムを扱う。

## 対象成果物

- `README.md`
- `steering/objective.md`
- `steering/product.md`
- `steering/tech.md`
- `steering/structure.md`
- `steering/actors.md`
- `steering/external-systems.md`
- `glossary.md`
- `steering/knowledge.md`
- `steering/knowledge/`
- `steering/policies.md`
- `steering/policies/`
- `domain-map.md`
- `context-map.md`
- `intents.md`

## 読む順序

1. `README.md`
2. `steering/objective.md`
3. `steering/product.md`
4. `steering/tech.md`
5. `steering/structure.md`
6. `steering/actors.md`
7. `steering/external-systems.md`
8. `glossary.md`
9. `domain-map.md`
10. `context-map.md`
11. `intents.md`

## Intent Layer へ進む基準

- 目的、主要アクター、必要な外部システム、主要ドメイン領域が確認済みである。
- 未確認事項が残る場合は、Intent 側で扱う問いとして明示されている。

## 責務境界

- Steering layer は複数 Intent で共有する前提を扱う。
- 個別 Intent の要求、ユースケース、Unit、Bolt、Task は Intent layer で扱う。
- Domain Map と Context Map は、採用済み情報がない空の表として作る。
- Subdomain、Bounded Context、コンテキスト間依存、詳細な Domain Model、契約の採用判断は対象 stage の承認済み成果物から扱う。
