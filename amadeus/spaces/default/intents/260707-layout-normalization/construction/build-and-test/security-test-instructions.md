# Security Test Instructions — Workspace Layout Normalization

## Upstream Inputs

この security test 方針は、各 unit の `code-generation-plan` と `code-summary` に基づく。今回の変更は docs/design-only で、auth、authorization、network boundary、secret handling、dependency graph、CI credential handling を変更していない。

## Applicability

今回、SAST/DAST や dependency vulnerability scan の追加実行は不要。

必要になる条件:

- setup package が installer として外部入力、filesystem write、network download、credential handling を扱う場合。
- `scripts/package.ts` や promotion logic が arbitrary path を受け取る場合。
- CI/CD pipeline、release artifact signing、dependency update を変更する場合。

## Command

今回の diff では dedicated security command は実行しない。layout decision に関係する integrity check として次を実行対象にする。

```bash
bun run promote:self:check
```

## Expected Coverage

期待する確認:

- generated distribution と project-local runtime surface の同期が保たれる。
- `packages/setup` は別 intent の sibling boundary として扱われ、この intent では installer security surface を追加しない。

## Test Data

追加 security fixture は不要。
