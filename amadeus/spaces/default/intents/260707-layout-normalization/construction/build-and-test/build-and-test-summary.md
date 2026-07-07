# Build and Test Summary — Workspace Layout Normalization

## Upstream Inputs

この summary は、各 unit の `code-generation-plan` と `code-summary` を入力として作成した。

| Unit | Build/Test interpretation |
| --- | --- |
| U1 Layout Decision Record | design record 更新。`core` / `harness` 実体を `packages/framework/` へ移動。 |
| U2 Contributor Documentation Update | README/docs navigation 更新。root `scripts` / `dist` 維持を明記。 |
| U3 Guard Validation Plan | validation checklist 追加。drift guard 実行対象を明文化。 |
| U4 Follow-up Migration Preparation | future migration slices 記録。`scripts` / `dist` 移動は follow-up 扱い。 |

## Overall Build Status

Build status: pass.

依存関係が未インストールだったため、初回は `bun install --frozen-lockfile` を実行してから TypeScript check を再実行した。その後 `packages/framework/package.json` と root workspaces を追加したため、`bun install` で `bun.lock` を更新し、`bun install --frozen-lockfile` が通ることを再確認した。

## Test Type Inventory

| Test type | Generated instructions | Executed in this stage | Result |
| --- | --- | --- | --- |
| Build/drift guard | yes | yes | pass |
| Unit | yes | yes, targeted docs legacy refs gate | pass |
| Integration | yes | targeted packaging parity | pass |
| Performance | yes | no, no runtime/performance path changed | not applicable |
| Security | yes | no dedicated scan, no security surface changed | not applicable |

## Coverage Expectations

- U1: `docs/reference/18-workspace-layout.md` が layout decision と guard preservation を説明していること。
- U2: README/docs navigation が design record へ到達でき、`packages/setup` sibling boundary を説明していること。
- U3: validation checklist が change type ごとの guard を分けていること。
- U4: future migration slices が current intent の implementation target と混同されないこと。

## Readiness Assessment

- Build-ready: yes.
- Test-ready: yes.
- Deployment-ready: yes, framework source relocation として merge 可能。

## Known Limitations

- `bun run lint` は終了コード 0 だが、既存 test files に Biome warning がある。今回の変更に直接起因しないため修正していない。
- full `bun tests/run-tests.ts --ci` は実行していない。source relocation に対して targeted packaging parity、docs legacy refs gate、drift/type/lint guard を実行した。
