# Code Summary — bolt-pr-attestation

## 実装結果

- Delivery Bolt の member Unit 集合を重複なし・昇順の正規形として runtime graph に投影した。
- 1つの Bolt が1つの PR/head tuple を共有しつつ、owner Unit ごとに異なる report payload、digest、attestation、audit receipt を生成するよう CLI・sensor・completion guard を統一した。
- 既存の単一 Unit title/body/report bytes を維持し、Delivery Planning を scope 上 SKIP する増分 self scope には state・Intent・scope・SKIP・Unit を digest で拘束する `engine-singleton` authority を追加した。
- partial/foreign/stale/tamper/copy/replay/head mismatch、authority 欠落、複数 Unit の曖昧性を fail-closed で拒否する。
- runtime graph 契約、PR convergence stage/sensor 契約、英日リファレンスを同期した。
- 実Intentで検出した、`construction/formal-model-check` をUnitと誤認する問題を、stateで宣言されたstage directoryの除外と回帰テストで修正した。

## 主な変更箇所

- `packages/framework/core/tools/amadeus-delivery-bolts.ts`
- `packages/framework/core/tools/amadeus-runtime.ts`
- `packages/framework/core/tools/amadeus-orchestrate.ts`
- `plugins/pr-convergence/tools/*.ts`
- `plugins/pr-convergence/stages/pr-convergence.md`
- `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md`
- `tests/unit/t-delivery-bolt-membership.test.ts`
- `tests/unit/t532-pr-convergence-provenance.test.ts`
- `tests/unit/t534-pr-convergence-report-attestation.test.ts`
- `tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts`
- `tests/integration/t533-pr-convergence-enforcement.integration.test.ts`
- `tests/integration/t534-pr-convergence-mandatory-lifecycle.integration.test.ts`

## 検証

- falling proof: 初期の canonical Unit-set seam 欠落を失敗として固定した。
- rebase後 focused suite: 94 pass / 0 fail / 391 assertions。
- `bun run typecheck`: PASS。
- `bun run build`: PASS。
- `bun run distribution:check`: PASS（444 payloads、4 documents、448 projections）。
- `bun run source-only:check`: PASS。
- `git diff --check`: PASS。
- 全体 `bun run coverage:ci`: 1004 files / 13,349 assertions を実行し、26 files / 115 assertions が失敗したため全体ゲートは FAIL。重点テストは全通過し、失敗集合には既知の高負荷・wall-clock drift と基準ブランチ由来の失敗を含む。カバレッジ集計自体は 92,824 / 101,744 lines。
- architecture review: Iteration 1 NOT-READY の3件を修正し、Iteration 2 Quality Repair closure で READY。

## 変更逸脱

- 計画外の機能追加はない。
- 実Intentでのみ存在した standalone stage directory の誤認を、PR作成前の実環境検証で発見したため、要求済み fail-closed authority の範囲内で最小修正した。
