# Unit Test Instructions — 260727-plugin-verb-skills

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(U1〜U4 の各 code-generation 成果物 — 実装対応と検証エビデンスの正本)

## 対象と実行

- t344-plugin-delegate(U1: fake spawn で委譲配列・rest 透過・exit 3系 — code-summary.md の PluginDelegateDeps seam)
- t350-runner-gen-plugin-targets(U3: runnerTargets 純関数 — code-generation-plan.md の in-process seam)

`bun test tests/unit/t344-plugin-delegate.test.ts tests/unit/t350-runner-gen-plugin-targets.test.ts`

## 完了条件

0 fail。spawn・実 FS を要する検証は unit に置かない(integration 側 — fs-tests-integration-first)。
