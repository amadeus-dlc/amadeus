# Scalability Design: U002-subagent-status-audit

## 上流文脈

この scalability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、payload classification と audit row normalization の予算を定義している。

`security-requirements` は、trusted source allowlist と message excerpt 最小化を定義している。

`scalability-requirements` は、payload size に対する O(1) field access と 3 状態 outcome を定義している。

`reliability-requirements` は、unknown fallback と old/new row compatibility を定義している。

`tech-stack-decisions` は、追加 package を不要とし、standard TypeScript の helper で閉じる判断を定義している。

`business-logic-model` は、U003 が U002 evidence を read-only に読む依存方向を定義している。

## Growth Model

U002 の成長対象は subagent hook event 数と audit row 数である。

Classification path は hook payload 単体で完結する。

Old row compatibility は reader normalization で扱い、既存 row を書き換えない。

U002 は U003 を呼ばない。

## Scaling Architecture

| Concern | Design | Trigger |
|---|---|---|
| payload size 増加 | top-level field access だけで分類する。 | SCALE001 |
| audit row 増加 | old/new row compatibility check を streaming 可能な normalization helper にする。 | SCALE002 |
| outcome 分岐増加 | success、failure、unknown の 3 状態を shared contract で固定する。 | SCALE003 |
| downstream analysis 増加 | event 名を増やさず additive field の reader を調整する。 | SCALE003 |
| U003 連携 | U003 は U002 evidence を read-only に読む。 | SCALE004 |

## Degradation Design

Unknown は failure ではなく evidence gap として扱う。

Unexpected status value は unknown にする。

Trustworthy status source が不足して unknown が増える場合は、hook input schema の改善を別 task にする。

Audit row reader が遅い場合は、migration ではなく normalization の読み方を見直す。

## AWS Platform Boundary

U002 は cloud workload ではない。

AWS infrastructure、message broker、database、queue-based decoupling は設計しない。

Infrastructure Design へ渡す logical component は、Subagent Status helper、audit adapter、reader normalization である。

## Verification Design

field access review で payload 全文解析が入っていないことを確認する。

1000 rows の fixture matrix で old/new row compatibility を確認する。

type and fixture review で outcome が 3 状態に閉じていることを確認する。

dependency review で U002 から U003 への呼び出しがないことを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability design は subagent event と audit row の増加に限定されている。

event 名を増やさないため、downstream analysis の分岐を抑えられる。
