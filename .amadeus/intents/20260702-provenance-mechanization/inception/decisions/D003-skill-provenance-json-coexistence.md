# D003: examples/skill-provenance.json との並立

## 背景

`examples/skill-provenance.json` は、example snapshot 生成に使った source skill の `SKILL.md` の md5 を記録する既存の契約であり、この Intent が導入する Intent 単位の provenance 記録と対象が異なる（GD004）。

## 判断

`examples/skill-provenance.json` とは統合せず、並立させる。将来の統合検討は #240 以降の候補として残す。

## 理由

`examples/skill-provenance.json` は example snapshot 再生成の鮮度管理に特化しており、`staleReason` による例外記録の仕組みを持つ。この Intent が扱うのは Intent ごとの作業実行の実測記録であり、対象範囲（example vs 任意 Intent）と粒度（skill md5 のみ vs policies.md の最低記録項目 9 項目）が異なるため、無理に統合すると両方の契約が複雑になる。

## 影響

この Intent の実装は `examples/skill-provenance.json` のスキーマや生成ロジックを変更しない。
