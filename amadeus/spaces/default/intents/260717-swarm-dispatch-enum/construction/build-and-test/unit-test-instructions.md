# Unit Test Instructions — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): 3 unit の code-generation 成果物(`code-generation-plan.md`・`code-summary.md` ×3)、`requirements.md`、`unit-of-work.md`。

## 対象と実行

- 新規: `tests/unit/t233-driver-resolution.test.ts`(手書き16セル matrix+rejected negative+invalid harness — `bun test ./tests/unit/t233-driver-resolution.test.ts`)
- 追随: `tests/unit/t181-conductor-skill-parity.test.ts`(三値トークン+codex c2 assertion)/ `tests/unit/t28-audit-event-sync.test.ts`(enum 不変)/ t207・t211(referee 回帰)
## 期待結果

- `requirements.md` FR-1(決定表同値)・FR-2(副作用ゼロ)・FR-4(語彙一対一)の受け入れを in-process で検証(`unit-of-work.md` U1/U2 受け入れの写像)
