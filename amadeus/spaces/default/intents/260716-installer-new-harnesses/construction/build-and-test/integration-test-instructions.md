# Integration Test Instructions — Issue #1048

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-generation-plan.md`(変更目録)、`../installer-enum-extension/code-generation/code-summary.md`(検証実測)。

## 対象と手順

- install 完走(FR-3): `bun test tests/integration/setup-install-flow.test.ts` — fakeHttp+buildCodeloadFixture で opencode / cursor の install→verify 完走+`--harness foo` exit 2+6値列挙(ネットワーク不要)
- AC-6e(t230): `bun test tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts` — opencode/cursor worktree marker の rung 2 解決を in-process assert(size medium、新規 export なし)
- フルスイート: `bash tests/run-tests.sh --ci`

## 実測

--ci: 364ファイル・5054 assertions・0 fail・RESULT: PASS(再接地後、reviewer iteration 2 も独立実測 exit 0)。
