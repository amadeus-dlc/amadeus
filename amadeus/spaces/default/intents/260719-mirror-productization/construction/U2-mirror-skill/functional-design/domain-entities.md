# Domain Entities — U2-mirror-skill(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## エンティティ

U2 は SKILL 文書(手順成果物)でありコード型を新設しない。扱う「エンティティ」は SKILL が案内する概念のみ:

| 概念 | 定義元(正本) | U2 での扱い |
|---|---|---|
| StatusOutcome の3値(clean/diverged/precondition) | U1 domain-entities(正本名 StatusFinding/StatusOutcome) | exit code(0/1/2)として観測し分岐案内に使う — 型は再定義しない(cross-unit-type-canonical-lift: U1 が正本) |
| 4 verb(status/create/sync/close) | amadeus-mirror.ts(移設後) | 実行コマンド文字列 `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts <verb>` のみ |

## SKILL frontmatter(session skills 様式 — ADR-6)

```
name: amadeus-mirror
user-invocable: true
```

- `classification: read-only` は**付けない**(S-03 既決 — create/sync/close へ分岐案内するため)。session skills の read-only 3種(session-cost/replay/grilling)との意図的相違として SKILL 本文に1行注記
