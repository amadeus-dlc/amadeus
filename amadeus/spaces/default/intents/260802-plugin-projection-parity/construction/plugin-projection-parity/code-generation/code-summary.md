上流入力(consumes 全数): requirements

# Code Summary — plugin-projection-parity

Issue #2018 の corrective `self-fix` として、選択済み `formal-model-check` pluginを5つのself-install面へ決定的に事前投影し、fresh checkoutを起動前から利用可能にした。startup composeは通常時write-0、欠損・drift時のみ現在面を修復する。

## 実装

| 領域 | 内容 |
|---|---|
| projection matrix | 7 harness manifestへ `stageEntry` を追加し、Codex=`.agents/skills`、Claude/Kimi=native runner、Cursor/OpenCode=command、Kiro 2面=package-onlyを正本化した。 |
| deterministic projection | `buildSelfInstallProjection` が正規composeを一時workspaceで実行し、選択、staging、payload、composition、compiled graph、必要entryを決定的bytesとして返す。時刻は固定し、audit、drops、journal、lockは除外する。 |
| promotion owner | `promote-self` が5面の投影をmanaged surfaceとして生成・検査し、MISSING、DIFFERS、ORPHAN、MISPLACEDを検出する。途中失敗時はdistribution transactionをrollbackする。 |
| startup repair | compositionの所有bytes、compiled graph、entry surfaceを検証し、欠損・改変時だけ所有済み投影を安全に解除して再構成する。既存trust timestampを保持し、修復後もtracked bytesを決定的状態へ戻す。 |
| runtime state | plugin audit、drops、journal、lockを全harnessのgitignoreへ追加し、決定的投影とmachine-local実行履歴を分離した。 |
| generated output | 7 package面を再生成し、self rootにはClaude、Codex、Cursor、OpenCode、Kimiの選択済み投影を反映した。root `.kiro` と `.codex/skills/amadeus-formal-model-check` は生成していない。 |

## 主な変更ファイル

- `scripts/manifest-types.ts`、`packages/framework/harness/*/manifest.ts`
- `scripts/plugin-projection.ts`、`scripts/promote-self.ts`、`scripts/package.ts`
- `packages/framework/core/tools/amadeus-harness.ts`
- `packages/framework/core/tools/amadeus-plugin.ts`
- `packages/framework/core/tools/amadeus-plugin-compose.ts`
- `packages/framework/core/tools/amadeus-runner-gen.ts`
- `tests/unit/t-plugin-projection.test.ts`
- `tests/unit/t356-promote-self-plugin-carveout.test.ts`
- `tests/integration/t415-plugin-optin-reconciliation.integration.test.ts`
- `tests/integration/t416-self-install-plugin-projection.integration.test.ts`
- `tests/e2e/t416-self-projection-fresh-git.serial.test.ts`
- `dist/*` と5 self-install面の決定的生成物

## 検証

- corrected-goal focused suite: 64 pass、0 fail、394 assertions
- contributor projection、promotion transaction、test-size driftの修正確認: 43 pass、0 fail、118 assertions
- fresh Git E2E:
  - startup前の5面stage／entry発見
  - 各面2回の通常composeがno-opかつGit clean
  - Codexの欠損／改変修復後もGit clean、他4面不変
  - plugin未選択zero-impact、Kiro package-only
- `bun run typecheck`: exit 0
- `bun run lint`: exit 0（既存warningのみ）
- complexity gate: 0 new violations、0 regressions
- `bun scripts/package.ts --check`: 7面すべてOK
- `promote-self --check --no-build`: OK
- `bun run distribution:check`: OK
- `bun run test:ci`: 757 test files、10,257 assertions、0 fail、RESULT: PASS

## Architecture Review

- **Reviewer:** amadeus-architecture-reviewer-agent
- **Iteration 1:** READY
  - 5 self-install面／7 package面の境界、Codex正規path、決定的生成物とruntime-localデータの分離、current-host限定修復、rollback、未管理ファイル保護を確認。
- **Iteration 2:** READY
  - 全CIで検出したcontributor runner誤分類を、plugin composition recordの `stageIndex.slugs` 由来へ限定して修正したことを確認。
  - orphan／misplacedが同一pathへ重なる場合も削除targetを集合化し、transactionの一意性を維持した。

## 計画からの具体化

- fresh Git E2Eは5つの独立fixtureではなく、実際のself repositoryと同じく5面を同居させた1つのGit checkoutで検証した。これによりcurrent-host-only repairと他4面byte不変を同じrepository statusで直接証明した。
- 欠損／改変修復では通常の明示dropが持つ未管理変更保護を弱めず、選択済み・台帳所有済みpathに限る内部repair optionを追加した。

## オープン事項

なし。
