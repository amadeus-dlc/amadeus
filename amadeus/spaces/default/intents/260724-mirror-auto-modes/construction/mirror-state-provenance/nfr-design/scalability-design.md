# Scalability Design — mirror-state-provenance

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Capacity Architecture

| Dimension | Bound | Behavior |
|---|---:|---|
| state | 2 MiB | pre-write reject |
| receipts | 1,000 | event-key map |
| warnings | 999＋capacity予約1 | same operation/classification/effect coalesce |
| active challenges | 100 | expired prune、consumed immediate remove |
| writers | 32 | lock＋revision CAS、written 1 |

active dataをcapacity都合で削除しない。prune／coalesceの旧proofは同じtransactionのaudit outboxへ含める。予約slotはkey=`state-capacity`のsingletonで、operation別keyを使わない。次のcapacity failureはslotを最新blocked operation／classificationへ置換し、旧slot全payloadを同じtransactionのaudit outboxへ退避する。通常warning slotを確保できなければsingletonをcommitし、remote mutationを開始しない。

## Concurrency

lock取得後にdocumentを再readしexpected revisionを比較する。stale callerへCAS retryを提供せずconflictを返す。32 caller fixtureはwritten exactly 1、lost update 0を要求する。

## Isolation

active／explicit Intentのstateだけを選び、全Intent scan、database、queue、daemonを追加しない。candidate 0／1／複数を丸めない。

## Verification

各boundと＋1、32 writer、non-default Space、active challenge prune、warning予約slotをtable／integration testで検証する。
