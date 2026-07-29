# Issue #1607 コード生成サマリー

## 概要

最終ステージ承認時の workflow 完了と GitHub mirror の完了境界を直列化した。mirror が有効な場合は、最終承認で durable な completion instance を準備し、Issue の Project status 更新と close が完了するまで Intent registry、active-intent cursor、監査台帳を終端化しない。mirror 完了後に同じ completion instance を指定した既存の `complete-workflow` コマンドだけが終端コミットを行う。

## 根本原因

- 最終 report が `complete-workflow` を先に実行し、mirror の完了境界を再開可能な状態で残す前に Intent を complete にしていた。
- construction の phase receipt が completed の場合、workflow completion 用の境界も完了済みと誤認して抑止していた。
- mirror 側は Issue を close するために完了済み registry を要求していた一方、registry 完了は監査台帳を seal するため、receipt と audit outbox を後から確定できない循環依存があった。

## 実装

- state に `Workflow Completion Instance`、`Workflow Completion Stage`、`Workflow Completion Status` を追加し、workflow completion を phase receipt から独立して永続化した。
- mirror 有効時の最終 `approve` は既存コマンドの内部フラグで workflow 完了を保留し、通常経路の `STAGE_COMPLETED` を含む終端監査列も保留した。
- orchestrator は durable completion instance を基準に completion boundary を再発行し、同一 instance の再試行を保証する。
- Project status の完了判定は、同じ completion instance の準備済みトランザクションを Done として扱えるようにした。
- sync、close、explicit skip の receipt が同一 Intent・境界 instance で settled し、audit outbox が空である場合だけ `complete-workflow --completion-instance` が終端コミットできるようにした。
- safety-blocked、abandoned、pending、instance 不一致は fail closed とし、registry と cursor を保持する。
- mirror off の既存経路と、完了後の監査 seal を維持した。

## TDD

### Red

- unit: `prepareWorkflowCompletion` が未実装のため、workflow completion identity テストが export 不足で失敗した。
- E2E: 最終 report が mirror directive ではなく `done` を返し、registry と cursor を先に終端化することを再現した。

### Green

- durable completion identity、instance 不一致、construction receipt からの独立性を unit/integration で検証した。
- multi-intent E2E で、mirror 未完了時の registry/cursor 保持、早すぎる終端コミットの拒否、settled 後の一度だけの終端化を検証した。
- lifecycle integration で、準備済み completion が registry in-flight のまま Project Done、Issue close、authorization landing まで到達することを検証した。
- 通常経路の `STAGE_COMPLETED` が mirror 完了前に出ず、終端監査列で一度だけ出ることを検証した。

## 検証

- `bun run typecheck`
- `bun run lint`（終了コード 0、既存基準内の warning 293件、info 21件）
- 完了境界と承認経路の集中回帰: 117 pass / 0 fail / 585 expect
- complexity gate: 新規違反0件、regression 0件
- `bun scripts/package.ts --check`
- `bun run promote:self:check`
- `bun run test:ci`: 652 test files / 8,998 assertions / 0 failures

ライブ Claude substrate が利用できない環境のため、SDK/live mechanism の該当ケースはテストハーネスの既定判定でSKIPされた。

## 生成物

canonical core の変更を7種類の `dist/` harness treeと、5種類の project-local self-install treeへ再生成した。
