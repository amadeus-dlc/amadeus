# Security Test Instructions — advisory-human-choice

## 上流成果物と脅威

`code-generation-plan.md`と`code-summary.md`の中心的なsecurity propertyは、人間のchoiceをAI、一般writer、別turn、stale instanceが偽造・再利用できないことである。対象は認証機能ではなく、human-presence capability、audit provenance、fail-closed decision boundaryである。

## 実行コマンド

```bash
bun test --timeout 120000 \
  tests/integration/t-advisory-human-choice-domain.test.ts \
  tests/unit/t203-mint-presence-classify.test.ts \
  tests/unit/t210-adapter-mint-classifier.test.ts \
  tests/integration/t378-advisories-directive-field.integration.test.ts \
  tests/integration/t381-advisory-checkpoints-latch.integration.test.ts \
  tests/integration/t-formal-verif-run-model-check-artifacts.integration.test.ts
```

静的確認として次を実行する。

```bash
bun run lint
rg -n "recordProtectedAdvisoryChoice|\.amadeus-advisory-choice" packages/framework tests
```

## Negative test観点

- receiptなし、一般`HUMAN_TURN`だけ、一般approvalだけではholdを解除できない。
- machine-injected prompt、非列挙choice、同じhuman turnの二重利用を拒否する。
- stale checkpoint、別spec、別target、別intent、別instanceのreceiptを拒否する。
- partial/incomplete、digest不一致、source provenance不成立、`DETECTED`、`HARNESS_ERROR`を成功へ読み替えない。
- path traversal、symlink、不正manifest、未完了publishをfail-closedで拒否する。
- Codex adapterが監査eventをmintしても、exact promptとの相関なしにreceiptを生成しない。

## 成功条件

- security propertyに対応するnegative testがすべてpassする。
- protected receipt writerが列挙され、任意入力を受ける一般CLI/APIとして露出していない。
- 認証情報や秘密情報を新規に保存せず、raw prompt本文を監査・receiptへ保存しない。
