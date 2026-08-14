# Integration Test Instructions — 260814-park-provenance

上流入力: `code-generation-plan.md` S5-S6、`code-summary.md`。

- `tests/integration/t3016-park-provenance.integration.test.ts`(5 tests): state 断面の park+grant 保持 / consume-once(resume は engine 経由)/ unattended 拒否 / engine 層パススルー / **engine 実経路の resume 往復**(`next --resume` → 名指しされた `unpark` → 再入。§12a iteration 1 BLOCKER 対応で FR-4 の名指し経路を充足)
- 実行: `bun test tests/integration/t3016-park-provenance.integration.test.ts`(builder 実測 5 pass / 0 fail)
- 落ちる実証: pre-change ツリー(`git stash` 断面)で 4 fail を実測済み(code-summary.md 記録)
- 関連既存: `tests/e2e/t122-stop-hook-e2e.test.ts`(新契約へ是正済み)
