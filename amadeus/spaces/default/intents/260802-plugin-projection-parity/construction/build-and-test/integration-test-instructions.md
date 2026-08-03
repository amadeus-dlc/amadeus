# Integration Test Instructions — plugin projection parity

## 上流成果物と対象境界

`code-generation-plan.md` と `code-summary.md` が実装したauthoring source → compose → promotion → startup repair → Gitの境界を検証する。filesystem／transaction検証はunit層へ置かず、integrationまたはE2Eで実ファイルを使う。

対象はpromotion transaction、plugin opt-in reconciliation、5面self-install projection、およびfresh Git E2Eである。

## Integration実行

```bash
bun test --timeout 120000 \
  tests/integration/t356-promote-self-plugin-carveout.integration.test.ts \
  tests/integration/t415-plugin-optin-reconciliation.integration.test.ts \
  tests/integration/t416-self-install-plugin-projection.integration.test.ts
```

合格条件:

- 5面の生成と2回目no-op、MISSING／DIFFERS／ORPHAN／MISPLACED検出がpassする。
- 事前検証失敗がwrite-0、途中失敗が開始前bytesへrollbackする。
- 未管理ファイル、別plugin、別harness面が保存される。
- startup repairがcurrent hostだけを修復し、通常時はwrite-0である。
- install／drop／doctor／stale／activation checkpointの既存契約が退行しない。

## E2E実行とGit fixture

```bash
bun test --timeout 120000 \
  tests/e2e/t416-self-projection-fresh-git.serial.test.ts
```

fixtureは実Git repositoryを作り、startup前のstage発見、startup 2回後の `git status --porcelain --untracked-files=all` 空、Codex欠損／改変修復、他4面byte不変、未選択zero-impact、Kiro package-onlyを検証する。各testが自身のtemporary directoryを所有し、共有mutable stateを残さない。

## Full regression

```bash
bun run test:ci
```

全test fileのfail 0、assertion fail 0を要求する。並列実行中だけtimeoutしたファイルは単独・120秒timeoutで再実行し、真のfailureかload flakeかを切り分ける。
