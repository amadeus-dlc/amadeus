# Code Summary — election-store(Bolt 1+Bolt 3)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1227+PR #1233)

| ファイル | 内容 | 検証 |
|---|---|---|
| `scripts/amadeus-election-store.ts` | elections/<ID>/ レイアウト+state 明示永続(business-logic-model.md)、writeStoreFile(tmp+rename)、fail-closed corrupt load(domain-entities.md StoreError)、全期間 duplicate 拒否(late 区画跨ぎ — requirements.md FR-3b)、amend 共存(原票不変)、後着レーン(classifyLate 経由+reexamRequired 永続 — FR-3d)、timeline 4種は実行結果からのみ(business-rules.md BR-S6 系)。書込は writeStoreFile 単一経路(performance-design.md の集約)+パス構成関数の書込境界(security-design.md) | t235 integration 8テスト(atomic 2 assert 対・corrupt・io-error 全分岐・amend 共存・後着+reexam・跨ぎ duplicate) |

## 横断整合(申告)

- TimelineEvent は U1 model へ canonical 化(U2 が voter 付きで永続 — U2/U3 FD 形状不一致の宣言的解消、PR #1233 本文に記録)。swarm check/finalize converged・untampered(unit-of-work.md の C2 担当面)。検証実測は PR #1233 に exit code 付きで記録(bolt-plan.md Bolt 3 行)
