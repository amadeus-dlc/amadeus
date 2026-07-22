# Build Instructions — goa-sparse-family

上流入力(consumes 全数): `../goa-sparse-acceptance/code-generation/code-generation-plan.md`（`code-generation-plan`）、`../goa-sparse-acceptance/code-generation/code-summary.md`（`code-summary`）。

## 前提と環境

- Bun とリポジトリ既定 dependency を使用する。新規 dependency、環境変数、外部 service、credential は不要。
- リポジトリ root で実行し、`git ls-files -u` が0件であることを先に確認する。
- AWS credential がない環境では既存 SDK/substrate test の skip/advisoryを許容するが、failed file/assertion は許容しない。

## Build と静的検査

次の順で実行し、各 exit code 0 を要求する。

```sh
bun run typecheck
bun run lint
bun run dist:check
bun run promote:self:check
```

`lint` の既存 complexity warning は advisory として分類する。core 正本と dist 6面/self-install 4面の byte drift、新規 error、未解決型参照は blocker とする。

## Build 検証とトラブルシュート

- `typecheck` 失敗: 最初の TypeScript diagnostic を正本3面へ帰属し、生成物を手編集しない。
- `dist:check` / `promote:self:check` 失敗: generator の正本入力を確認し、既定 generator で再生成する。
- full test 失敗: targeted suite で責務面を特定し、2回の是正で閉じなければ gate finding として停止する。
- 完了時は `git diff --check`、`git ls-files -u`、patch coverage を機械確認する。
