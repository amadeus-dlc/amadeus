# Scalability Requirements: U002-subagent-status-audit

## 上流文脈

この scalability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、Subagent Status が hook payload を分類し、audit evidence を残す流れを定義している。

`business-rules` は、classification を allowlist matching に限定し、old row compatibility を normalization で扱う方針を定義している。

`requirements` は、R004、R007、R008、R009、NFR004、NFR005 を定義している。

## Capacity Targets

| ID | Capacity target | Measurement |
|---|---|---|
| SCALE001 | hook payload classification は payload size に対して O(1) の field access で完了する。 | unit test review |
| SCALE002 | old/new audit row compatibility check は 1000 rows の fixture matrix で完了する。 | fixture benchmark |
| SCALE003 | outcome enum は success、failure、unknown の 3 状態を維持し、追加状態で downstream analysis を増殖させない。 | type and fixture review |
| SCALE004 | U003 は U002 evidence を read-only に読むため、U002 から U003 への呼び出しを増やさない。 | dependency review |

## Growth Model

U002 の成長対象は subagent hook event 数と audit row 数である。

classification path は hook payload 単体で完結する。

old row compatibility は read path で normalizing し、既存 row の rewrite を必要としない。

## Scaling Triggers

| Signal | Trigger | Required response |
|---|---|---|
| classification latency が 2ms p95 を超える | payload 全文解析が混入した | field allowlist へ戻す |
| unknown が過剰に多い | trustworthy status source が不足している | hook input schema の改善を別 task にする |
| audit row reader が遅い | row normalization が scan 全体に広がった | streaming normalization を検討する |
| downstream analysis が event 名分岐を要求する | event 名を増やしたくなる | additive field のまま reader を調整する |

## Degradation Policy

unknown は failure ではなく evidence gap として扱う。

unexpected status value は unknown にする。

audit append failure は failed result として返し、classification result を stdout に出さない。

old row は migration せず、reader で unknown として扱う。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability target は subagent event 数と audit row 数に限定されている。

event 名を増やさず additive field を使うため、downstream analysis の分岐を抑えられる。
