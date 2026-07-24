# Performance Design — U5 completeness-sensor

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 実行経路

- mapを1回parseし、canonical path順に各regular fileを1回open・hashする。結果配列だけをmemoryに保持する。
- 100 entry・10MiB fixtureをwarm-up 2回後に10回実行し、全回10秒未満を要求する。

## 計測

- manifest dispatch開始からverdict生成までを計測し、OS、CPU、Bun版、entry数、総bytesを記録する。
- TLC時間、network、永続cacheは対象外とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:18:14Z
- **Iteration:** 1
- **Scope decision:** none

容量計算量、情報開示、クラッシュ耐久性、障害境界にMajor 4件があります。

### Findings

- O(n log n)が上流O(entries)に違反
- 外部findingsのhashが情報開示契約に矛盾
- atomic publishのdirectory fsyncと回復が不足
- failure domainとblast radiusが不足

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:19:20Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のMajor 4件はすべて閉包し、新規blocking findingはありません。

### Findings

- Resolved — O(n)+O(bytes)、finding redaction、crash-durable publish、failure domainを具体化しました。
