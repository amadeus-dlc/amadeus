# Integration Test Instructions — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md § 検証(BR-6)、code-summary.md(配送断面と受け入れ grep 述語の対応)

## 対象

docs 消費ガードの integration 層 5 本 + 生成マトリクス検査:

```
bun test tests/integration/t48-audit-event-emitters.test.ts tests/integration/t52-drift-meta-validation.test.ts tests/integration/t287-mirror-docs-contract.integration.test.ts tests/integration/t291-mirror-docs-parity.integration.test.ts tests/integration/t-pi-docs-contract.test.ts
bun tests/harness/live-e2e/project-matrix.ts check
```

- t48: 12-state-machine ⇄ VALID_EVENT_TYPES ⇄ audit-format の三面一致(D-9 の JA 節移植の emitter セルを実装と照合する実効ガード)
- t52: 12-state-machine の drift meta
- t287/t291: mirror docs の契約・EN/JA parity
- t-pi-docs-contract: 実 corpus に対する唯一の対訳同期ガード
- project-matrix check: live-e2e.md の生成マトリクス整合(F-8 の JA 版が EN 参照方式であることの前提検査)

## 受け入れ grep 述語(FR 別 — requirements.md の各受け入れ基準を実行)

誤件数語残存 0(FR-1)/ self-* 解説実体 EN/JA 対(FR-3)/ 7 識別子 EN/JA ≥1(FR-5)/ 凍結注記 ≥1 + 注記のみ diff(FR-4)/ live-e2e.ja 実在 + H2 一致(F-8)/ 被リンク ≥1(F-9)。

## 判定

テスト exit 0(path 数照合込み)+ 全述語成立。
