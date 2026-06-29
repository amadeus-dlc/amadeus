# Grilling Issue Rules

このルールは、このリポジトリで `grill-me` または `grill-with-docs` を使って設計プランを質問で詰めた後の記録先を決めるときに適用する。

## 基本方針

設計プランの grilling session が完了したら、最終的な記録は GitHub Issue として作成する。

GitHub Issue には、確認した設計プラン、確定した判断、残った論点、次に取るべき実施候補を含める。

## 記録先

`grill-me` を使った場合は、質問で確定した内容を GitHub Issue にまとめる。

`grill-with-docs` を使った場合も、このリポジトリでは最終記録を GitHub Issue にまとめる。

`docs/amadeus/` は、Amadeus DLC の継続的な設計文書や成果物契約を置く場所として扱う。

そのため、設計プランの grilling session から生まれた単発の実施候補、未確定論点、作業分解は `docs/amadeus/` に追加せず、GitHub Issue で管理する。

## GitHub Issue の内容

GitHub Issue は、後続作業者が実施可否を判断できる粒度で書く。

少なくとも次を含める。

- 背景
- 確定した判断
- 未確定事項
- 実施候補
- 受け入れ条件

## 例外

grilling session で Amadeus DLC の成果物契約そのものを変更する判断が確定した場合だけ、対応する `docs/amadeus/` の文書更新を検討してよい。

その場合も、設計文書更新と実施作業を同じ場所に混ぜず、必要な作業を GitHub Issue に分けて記録する。
