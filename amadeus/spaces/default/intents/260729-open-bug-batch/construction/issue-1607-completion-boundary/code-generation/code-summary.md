# Issue #1607 コード生成サマリー

## 概要

最終ステージ承認時の workflow 完了と GitHub mirror の完了境界を直列化した。mirror が有効な場合は、最終承認で durable な completion instance を準備し、Issue の Project status 更新と close が完了するまで Intent registry、active-intent cursor、監査台帳を終端化しない。mirror 完了後に同じ completion instance と明示的な Intent selector を指定した既存の `complete-workflow` コマンドだけが、再開可能な終端コミットを行う。

## 根本原因

- 最終 report が `complete-workflow` を先に実行し、mirror の完了境界を再開可能な状態で残す前に Intent を complete にしていた。
- construction の phase receipt が completed の場合、workflow completion 用の境界も完了済みと誤認して抑止していた。
- mirror 側は Issue を close するために完了済み registry を要求していた一方、registry 完了は監査台帳を seal するため、receipt と audit outbox を後から確定できない循環依存があった。
- lifecycle と terminal commit の間で active-intent cursor が移動すると、暗黙解決が別 Intent を対象にし得た。
- `complete-workflow` の途中で process が落ちると、先に追記済みの terminal audit を識別できず、再試行時の重複または完了不能につながった。
- lifecycle snapshot の `Status`、`Current Stage`、`Lifecycle Phase` が欠落・不正でも代替値で継続し、壊れた snapshot を remote mutation 判定へ渡していた。

## 実装

- state に `Workflow Completion Instance`、`Workflow Completion Stage`、`Workflow Completion Status` を追加し、workflow completion を phase receipt から独立して永続化した。
- mirror 有効時の最終 `approve` は既存コマンドの内部フラグで workflow 完了を保留し、通常経路の `STAGE_COMPLETED` を含む終端監査列も保留した。
- orchestrator は durable completion instance を基準に completion boundary を再発行し、同一 instance の再試行を保証する。
- orchestrator が出力する lifecycle、receipt 更新、`complete-workflow` の全コマンドに `--intent` と `--space` を埋め込み、cursor に依存せず同じ record を指すようにした。`complete-workflow` 自身も selector を解決し、同じ target context の state、audit、registry を更新する。
- Project status の完了判定は、同じ completion instance の準備済みトランザクションを Done として扱えるようにした。
- sync、close、explicit skip の receipt が同一 Intent・境界 instance で settled し、audit outbox が空である場合だけ `complete-workflow --completion-instance` が終端コミットできるようにした。
- terminal audit 4行へ `Completion Instance` を記録し、各行を個別に再実行防止した。state Completed、registry complete、cursor clear も冪等にし、7つの永続化境界のどこで停止しても同じコマンドで収束する。
- cursor clear は compare-and-clear とし、対象 Intent を指し続けている場合だけ解除する。lifecycle 中に別 Intent へ移った cursor は保持する。
- lifecycle snapshot は `Lifecycle Phase`、`Status`、`Current Stage` と pending completion stage の整合性を検証し、欠落、不正値、`Running + none`、`Completed + 実stage`、pending stage 不一致を remote mutation 前に fail closed にした。
- safety-blocked、abandoned、pending、instance 不一致は fail closed とし、registry と cursor を保持する。
- mirror off の既存経路と、完了後の監査 seal を維持した。

## 設計裁定

新しい汎用 saga や二重の completion store は追加しなかった。既存の workflow state に durable identity を置き、mirror の receipt／ledger／outboxを着地証拠として再利用し、既存の `complete-workflow` を replay-safe な terminal committer にした。この構成なら remote operation と local terminal commit の責務を分離したまま、各永続化境界を既存 workspace lock 内で再開できる。

## TDD

### Red

- unit: `prepareWorkflowCompletion` が未実装のため、workflow completion identity テストが export 不足で失敗した。
- E2E: 最終 report が mirror directive ではなく `done` を返し、registry と cursor を先に終端化することを再現した。

### Green

- durable completion identity、instance 不一致、construction receipt からの独立性を unit/integration で検証した。
- multi-intent E2E で、実際の final report が出力した selector 付き lifecycle command を実行し、途中で cursor を別 Intent へ移しても元の Intent だけが同期・終端化されることを検証した。成功 receipt の直接注入は使っていない。
- lifecycle integration で、準備済み completion が registry in-flight のまま Project Done、Issue close、authorization landing まで到達することを検証した。
- 通常経路の `STAGE_COMPLETED` が mirror 完了前に出ず、終端監査列で一度だけ出ることを検証した。
- remote crash matrix は final sync 前、Project Done 反映後、close 前の3点を個別に停止させ、同じ instance の再試行で edit、Project update、close が各1回だけになることを検証した。
- terminal crash matrix は4つの terminal audit 追記後、state Completed 後、registry complete 後、cursor clear 後の7点を個別に process crash させた。再試行で各 terminal audit が1行だけになり、state、registry、cursor が収束し、さらに3回目の実行で state bytes と audit count が不変であることを検証した。
- lifecycle snapshot の欠落・不正・相互不整合を表形式で検証し、全ケースで remote call 前に error outcome となることを確認した。

## 検証

- `bun run typecheck`
- `bun run lint`（終了コード 0、既存基準内の warning 293件、info 21件）
- 完了境界と承認経路の集中回帰: 128 pass / 0 fail / 680 expect
- complexity gate: 新規違反0件、regression 0件
- `bun scripts/package.ts --check`
- `bun run promote:self:check`
- `git diff --check`
- `bun run test:ci`: 652 test files / 9,019 assertionsを実行し、追加したspawn testのmechanism ratchet未登録と、terminal audit helperを追跡しない既存静的pairing test、そのmeta-testの3件を検出した。
- 上記3件を修正後に直接再検証: 24 pass / 0 fail / 43 expect
- 修正後のIntegration tier全体: 314 test files / 3,819 assertions / 0 failures

ライブ Claude substrate が利用できない環境のため、SDK/live mechanism の該当ケースはテストハーネスの既定判定でSKIPされた。

## 生成物

canonical core の変更を7種類の `dist/` harness treeと、5種類の project-local self-install treeへ再生成した。生成物を直接編集していない。
