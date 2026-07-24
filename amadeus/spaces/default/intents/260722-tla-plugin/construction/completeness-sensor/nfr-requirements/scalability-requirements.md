# Scalability Requirements — U5 completeness-sensor

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 容量

- 1つの map で少なくとも1,000 entryを決定的に処理できる構造とし、entry数に対する二次走査を持たない。
- Drift は map の entry 順で安定ソートされ、複数不一致でも全件を列挙する。

## 成長方針

- 並列ハッシュ、永続キャッシュ、分散処理は現時点で導入しない。
- 10秒予算を実測で超えた場合だけ、内容ハッシュキャッシュまたはbounded concurrencyを再評価する。
