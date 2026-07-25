# Code Generation Summary — mirror-operation-lifecycle

## 実装結果

C6 Mirror Operation Executor、C7 Mirror Lifecycle Coordinator、C8 Presentation と、C7 を production から await する lifecycle adapter を実装した。レビュー反復1の AR-01〜03 をすべて是正した。

## 作成・変更ファイル

### 正本

- 新規:
  - `packages/framework/core/tools/amadeus-mirror-executor.ts`
  - `packages/framework/core/tools/amadeus-mirror-coordinator.ts`
  - `packages/framework/core/tools/amadeus-mirror-lifecycle.ts`
  - `packages/framework/core/tools/amadeus-mirror-presentation.ts`
- 変更:
  - `packages/framework/core/tools/amadeus-mirror-config.ts`
  - `packages/framework/core/tools/amadeus-mirror-state-codec.ts`
  - `packages/framework/core/tools/amadeus-mirror-state-reducer.ts`
  - `packages/framework/core/tools/amadeus-mirror-types.ts`
  - `packages/framework/core/tools/amadeus-orchestrate.ts`
  - `packages/framework/core/skills/amadeus-mirror/SKILL.md`

### テスト

- 新規:
  - `tests/unit/t279-amadeus-mirror-executor.test.ts`
  - `tests/unit/t280-amadeus-mirror-coordinator.test.ts`
  - `tests/unit/t281-amadeus-mirror-presentation.test.ts`
  - `tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`
- 変更:
  - `tests/unit/t265-engine-boundary.test.ts`
  - `tests/integration/t265-engine-boundary.integration.test.ts`
  - `tests/e2e/t265-engine-boundary.test.ts`
  - `tests/unit/t268-amadeus-mirror-policy.test.ts`

### 生成面とIntent記録

- `bun run dist` により、Claude／Codex／Cursor／Kiro／Kiro IDE／OpenCodeの各 `dist/<harness>/` へ、上記4新規tool、5変更tool、`amadeus-mirror` skillを同期した。
- `bun run promote:self` により、project-localの `.claude/`、`.codex/`、`.cursor/`、`.opencode/` へ同じtool／skillを同期した。
- Intent記録として `code-generation-plan.md`、本 `code-summary.md`、`amadeus-state.md`、clone固有audit shardを更新した。

### Production 経路

- `amadeus-mirror-lifecycle.ts` は Space、Intent、repository、state を実データから解決し、`driveMirrorBoundary` を await する。
- engine の同期 routing は維持し、Intent Capture、phase verification、park、workflow completion では永続 boundary identity を含む adapter command を出力する。
- manual create／sync／close は同 adapter の明示 operation／invocation identity を使う。
- config 解決は明示 Space を受け取り、active-space cursor に依存しない非 default Space を扱う。

### Durable authorization

- `landingVerified`、`finalSyncSucceeded`、`promptApproved` の boolean carrier を削除した。
- `MirrorExecutionAuthorization` 判別 union（auto／prompt-approved／manual）を receipt に永続化した。
- authorization は event、operation、boundary instance、receipt revision と、種別ごとの mode／binding ID＋answer ID／invocation ID を保持する。
- completion landing は型付き `{registryStatus:"complete",workflowStatus:"Completed"}`、close は成功済み workflow-completion sync receipt key を保持する。
- C6 は persisted authorization と invocation authorization を照合し、全 guard 通過後にだけ mutation permit を発行する。
- prompt approve／skip は expected binding の検証と消費を C3 の単一 CAS transition で行い、replay で再 mutation しない。

### Reliability

- create／sync／close の remote 成功後 local completion write failure は `pending + outcome-unknown` を残し、次回に remote evidence から同一 operation へ収束する。
- close は既に CLOSED の Issue を新しい manual boundary から再実行しても remote close を繰り返さない。
- full Intent UUID と durable boundary を符号化した event key を許容しつつ parser bound を維持するため、key 上限を 512 bytes にした。

## テスト範囲

- t279: C6 create／sync／close、authorization mismatch の remote-before block。
- t280: off／prompt／auto、prompt approve／skip、completion chain、reconciliation。
- t281: Issue／status／prompt presentation と redaction。
- t282: real filesystem state store と production adapter を通し、prompt binding の原子的消費と replay 防止、Intent Capture／phase／park、manual create／sync／close、明示 Intent、non-default Space、provenance mismatch、create／sync／close の post-remote local failure recovery を検証。
- t265: engine bridge、全配布 harness、固定 lifecycle adapter command。

## 配布

`bun run dist` と `bun run promote:self` で Claude／Codex／Cursor／Kiro／Kiro IDE／OpenCode の dist と project-local self-install 面へ同期した。runtime dependency、database、API endpoint、IaC、background workerは追加していない。

## 計画からの逸脱

- 初回計画ではengine／manual CLIからC7をproduction起動する完全配線を後続へ送るとしていたが、Architecture Review Iteration 1のAR-01により、Unit 4とFR-3／FR-4／FR-7の完了条件に反すると判明した。このため、同期engine routingを維持したままawait可能な`amadeus-mirror-lifecycle.ts`を追加し、Intent Capture／phase／park／completion／manual全操作へ接続した。
- 初回実装の`landingVerified`、`finalSyncSucceeded`、`promptApproved` boolean carrierは、AR-02により`security-design.md`の型付きauthorization契約を満たさないと判明した。これらを削除し、durableな`MirrorExecutionAuthorization`判別unionとreceipt再検証へ置換した。
- AR-03対応として、t282をfake-driven core確認だけで終えず、production adapter、明示Intent、non-default Space、provenance mismatch、create／sync／closeのpost-remote failure recoveryまで拡張した。
- C3 reducerのprompt approve／skip単一CAS拡張は計画対象表外だったが、reviewerが上流の原子性契約に必要な変更として明示的に承認した。新規runtime dependencyや一般的なengine refactorは追加していない。

## 最終検証

| 検証 | 結果 |
|---|---|
| t265＋t279〜t282 | 86 pass、0 fail、331 expect、7 files（`t265` unit／integration／e2eの3ファイル＋`t279`〜`t282`の4ファイル） |
| Mirror 回帰 t257／t268〜t278 | 219 pass、0 fail、436 expect、14 files |
| `bun run typecheck` | exit 0 |
| changed-file Biome check | exit 0、error 0（既存方針の complexity warning 21） |
| `bun run dist:check` | exit 0、6 harness OK |
| `bun run promote:self:check` | exit 0、4 self-install 面 OK |
| `git diff --check` | exit 0 |

## Human-approved Repair CLI Remediation

### 結果

`mirror-distribution-docs`のhard stopを解消するため、production lifecycle adapterから到達できる`repair status`、`repair relink --issue <n>`、`repair abandon --operation <id>`を実装した。続くsecurity契約矛盾について、人間承認によりProvenance V2を追加した。

V2はinspection-clock `createdAt`をcanonical provenance bytesへ含める。既存V1 stateはread互換を維持するが、新規relinkはV2のみを発行し、V1 downgrade fallbackを持たない。C3 reducerは適用provenanceからV2 digestとplan digestを再計算してchallengeと同じatomic transition内で比較する。

### 追加・変更ファイル

正本:

- `packages/framework/core/tools/amadeus-mirror-lifecycle.ts`
- `packages/framework/core/tools/amadeus-mirror-repair.ts`
- `packages/framework/core/tools/amadeus-mirror-state-codec.ts`
- `packages/framework/core/tools/amadeus-mirror-state-reducer.ts`
- `packages/framework/core/tools/amadeus-mirror-types.ts`

テスト:

- 新規`tests/unit/t283-amadeus-mirror-repair-cli.test.ts`
- 新規`tests/integration/t284-amadeus-mirror-repair-cli.integration.test.ts`

生成面:

- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/`の対応tool
- `.claude/`、`.codex/`、`.cursor/`、`.opencode/`の対応tool

Intent記録:

- `construction/mirror-operation-lifecycle/code-generation/code-generation-plan.md`
- `construction/mirror-operation-lifecycle/code-generation/code-summary.md`

### Security／compatibility evidence

- V1 stateはschema 1のまま同じfield意味でread／render可能。
- 新規relink provenanceはschema 2のみで、canonical順に`createdAt`を含める。
- C3はV2 provenance、Issue、Intent UUID、repository、operation ID、createdAtからplan bindingを再計算する。
- V1 injection、createdAt改ざん、external marker、別plan、challenge replay／expiryはrepair state mutation 0件。
- statusはstate bytes不変、GitHub mutation method呼び出し0件。
- abandon replayは追加challenge／state write／GitHub mutation 0件。

### 追加検証

| 検証 | 結果 |
|---|---|
| t274〜t276、t278、t282〜t284 | 66 pass、0 fail、181 expect、7 files |
| t283＋t284 | 9 pass、0 fail、38 expect、2 files |
| Mirror全回帰t257／t265／t268〜t284 | 314 pass、0 fail、805 expect、23 files |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0、error 0、既存complexity warning 275、info 19 |
| `bun run dist` | exit 0、6 harness生成 |
| `bun run promote:self` | exit 0、4 self-install面生成 |
| `bun run dist:check` | exit 0、6 harness OK |
| `bun run promote:self:check` | exit 0、4 self-install面 OK |
| coverage registry generator | exit 0、289/519 units、`tests/.coverage-registry.json`／ratchet更新 |

### 計画からの逸脱

- lifecycle初回計画はt282までだったが、人間承認の追加remediationとしてt283／t284を採番した。
- 既存Provenance V1のsilent reinterpretは行わず、明示V2を追加した。これは人間が選択肢1として承認したsecurity deviationである。
- 後続`mirror-distribution-docs`の仮予約t283〜t291は、実装開始前にt285以降へ一括renumberする。
