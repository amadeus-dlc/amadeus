# Domain Entities — fix-1170-retreat-guard(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## エンティティ(既存型の再利用 — 新規型ゼロ)

| 型 | 定義位置 | 本 unit での役割 |
|---|---|---|
| `CheckboxLine { slug, state, suffix }` | amadeus-lib.ts:3744-3748(既存 export) | parseCheckboxes の戻り値 — 後退判定の入力(ADR-4) |
| `CheckboxState`("pending"/"in-progress"/"awaiting-approval"/"revising"/"completed"/"skipped") | amadeus-lib.ts:58(既存 export union) | 判定語彙 — BR-1 の対象2値はこの enum の部分集合 |
| state ファイル内容(string) | readStateFile/writeStateFile(既存) | RMW の対象 — parse-don't-validate は parseCheckboxes が担う(生 regex を handleSetStatus に持ち込まない) |

新規エンティティ・ブランド型は導入しない — 判定は既存型の部分集合述語で完結し、ラッパー型が正しさを変えない(ddd-when-to-wrap-primitives の非適用判断)。

## 不変条件

- Stage Progress checkbox の後退不変条件(BR-1)は set-status 経路にのみ課す — 状態機械全体の単調性制約ではない(engine の reject/revise 等は正当な遷移として除外、FR-1e/Out of Scope)
