# Scalability Design — U5 completeness-sensor

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 容量設計

- mapのcanonical形式自体にpath昇順を要求し、parse時に直前pathとの単調増加と重複を単一passで検証する。検査時のsortを禁止し、1,000 entryまでO(n)+O(bytes)で処理する。
- Driftは入力のcanonical path順を保持して全件列挙し、first failureで打ち切らない。

## 拡張条件

- 10秒を超える実測が出た場合だけbounded concurrencyを検討する。DB、daemon、分散queueは導入しない。
- 並列化時もfd単位の検証と安定sortを維持する。
