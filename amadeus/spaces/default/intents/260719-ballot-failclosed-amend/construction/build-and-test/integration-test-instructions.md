# Integration Test Instructions — 260719-ballot-failclosed-amend

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象と実行

```
bun test tests/integration/t235-election-store.integration.test.ts   # unknown-ref 拒否+ledger 無変更 / amend 共存+timeline
bun test tests/integration/t236-election-loop.integration.test.ts    # vote verb amend 閉包 / tally 単一計上 / verify green
bash tests/run-tests.sh --ci                                          # フルスイート
```

## 実測記録

builder: t235 10 pass、t236 追加分 green、--ci = RESULT: PASS(Failed files 0 / Failed assertions 0)。e4 独立再実測(PR レビュー): live e2e で3機能閉包+落ちる実証の独立再現(赤→SHA 復元 32 pass)+corpus 44 ledger/106 ballots 赤 0(e4 時点の store 全数 — builder 時点 42/98 から増加、glob 全数方式が件数増へ自動追従した実証)。
