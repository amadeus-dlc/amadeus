# Integration Test 手順 — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## 対象と環境

- `tests/integration/t245-amadeus-leader-sync.integration.test.ts` の 23 ケースを対象とする。
- `mkdtemp` workspace、実 Git、一時 bare remote、fake Git/Gh port を使用し、ネットワーク・実 GitHub 書込は行わない。

## 実行と期待値

- 実行: `bun test tests/integration/t245-amadeus-leader-sync.integration.test.ts`
- 期待: 23 pass、0 fail。
- create は origin/main 起点隔離 worktree、owned-only copy、memory restore、self-check、push、PR create の順を固定し、auto-merge を呼ばない。

## Falling proof

- memory rollback と member snapshot 注入が赤になり、restore/removal 後だけ green へ戻ることを確認する。
- `owned.shardPaths=[]` では foreign 99 行の応答を用意しても `shardDeltaLines=0`、unscoped numstat 呼出し 0 件であることを確認する。
