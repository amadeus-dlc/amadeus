# Integration Test Instructions — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## 対象と実行

- Bolt 1(#1736): `bun test tests/integration/t366-skill-new-intent-verb.test.ts` — tracked SKILL.md 全数への2述語(utility 経路 0件、--new-intent は orchestrate)。FR-1b AC grep(SKILL 面限定)= 0件。
- Bolt 2(#1711): `bun test tests/integration/t367-degrade-unitname-resolution.test.ts` — 解決 emit(directive.unit 搬送含む)/ fail-closed 両条件 / reviewer-runtime scope exit 0 の end-to-end。
- 回帰: `bun test tests/integration/t247-runtime-recovery.test.ts`(unit dir seed 済み)。

## 実測

t366 = 27 pass(PR #1753 マージ済み・落ちる実証済み)。t367 = 9 pass(unit assert 追加後、dist 再生成のうえ実測 — テストは dist/claude コピーを spawn する)。
