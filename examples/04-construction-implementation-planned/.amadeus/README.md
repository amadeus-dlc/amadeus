# Amadeus Workspace

## 対象プロダクト

**EC サイト最小購入フロー**の Amadeus 成果物を扱う。

主目的は、利用者が商品を選択して注文を作成できる最小の購入体験を提供することである。

## 構成

この workspace は、次の 2 層で構成する。

- Steering layer：複数 Intent で共有する目的、方針、知識、用語、アクター、外部システムを扱う。入口は [steering.md](steering.md) である。
- Intent layer：個別の作業テーマを Intent として扱う。一覧は [intents.md](intents.md) である。

## 読む順序

1. [steering.md](steering.md)
2. [intents.md](intents.md)
3. 対象 Intent のモジュールファイルと `intents/<intent-id>-<slug>/state.json`

## 作成経緯

この steering layer は、`amadeus-steering` の scaffold-only モードで作成した。

質問による確認を行っていないため、確定していない値は `未確認` と書き、確認すべき問いを [steering/knowledge.md](steering/knowledge.md) の未確認事項に残している。
