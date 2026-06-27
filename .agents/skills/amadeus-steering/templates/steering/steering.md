# Steering

## 役割

- `<product-name>` の Amadeus 成果物で共有する目的、方針、知識、用語、アクター、外部システム、ドメイン境界を扱う。

## 対象成果物

- `README.md`
- `objective.md`
- `actors.md`
- `external-systems.md`
- `glossary.md`
- `knowledge.md`
- `policies.md`
- `domain/subdomains.md`
- `domain/bounded-contexts.md`
- `intents.md`

## 読む順序

1. `README.md`
2. `objective.md`
3. `actors.md`
4. `external-systems.md`
5. `glossary.md`
6. `domain/subdomains.md`
7. `domain/bounded-contexts.md`
8. `intents.md`

## Intent Layer へ進む基準

- 目的、主要アクター、必要な外部システム、主要ドメイン領域が確認済みである。
- 未確認事項が残る場合は、Intent 側で扱う問いとして明示されている。

## 責務境界

- Steering layer は複数 Intent で共有する前提を扱う。
- 個別 Intent の要求、ユースケース、Unit、Bolt、Task は Intent layer で扱う。
