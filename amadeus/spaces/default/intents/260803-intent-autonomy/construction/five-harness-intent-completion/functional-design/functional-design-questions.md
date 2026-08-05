# Functional Design Questions — five-harness-intent-completion

## 上流入力

`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`を照合した。

## 確認結果

要求レベルの未決事項はない。Issueどおり、次を確定事項として設計する。

- 現行対象はClaude Code、Codex、Cursor、OpenCode、Kimi Codeの5harnessである。Kiro / Kiro IDEはregistryに残すが、今回のcompletion cohortへ含めない。
- live smokeはcredential-attestedな明示認可を必須とし、secret / tokenそのものをrecordへ保存しない。
- `skipped / failed`、Judge未観測、electionまたはloud degradation未観測、revision / package / registry / environment / trace / attestation不一致はpassにしない。
- 5harnessすべての検証済みreceiptが同じIntent・実装revision・package digest・registry digest・scenario digestへ一致した場合だけIntent terminal transitionを計画する。
- completion transactionはgrant completion、workflow null、`WORKFLOW_COMPLETED`を原子的に確定し、commit receipt確認後だけcompleted resultを返す。
- session / process / compaction / clone後もreceipt集合とterminal stateをcanonical auditから復元する。
- completed Intentのdecision reviewはU4のpost-seal review extensionで継続できる。
- PR、merge、runner / supervisor、Kiro系live対応は完了条件へ含めない。

Issue外の矛盾・抜け漏れは検出していないため、追加の人間判断は不要である。

## Optional artifact判断

`frontend-components.md`は生成しない。U5は既存CLI / Bun live runner / audit transaction / harness registryのbehaviorであり、新規frontend componentを含まない。
