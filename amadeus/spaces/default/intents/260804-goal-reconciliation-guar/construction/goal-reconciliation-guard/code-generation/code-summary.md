# Goal Reconciliation Guard コード生成サマリー

## 実装結果

- Intent birth 時に immutable な Goal revision 0 を作成し、Goal ID、revision、digest を workflow state へ投影した。
- Goal change proposal、専用 human gate、revision approval、reconciliation、legacy migration を `amadeus-goal.ts` に実装した。通常の stage approval、standing grant、別 session / Intent の証跡では Goal revision を変更できない。
- Goal lineage、proposal、evidence、reconciliation receipt の厳格な codec、canonical digest、atomic persistence を `amadeus-goal-reconciliation.ts` に集約した。
- workflow 完了前に current Goal、scope、final in-scope stage、completion instance、`ACHIEVED` receipt を照合する共通 authority を導入した。direct completion、finalize、gated / non-gated report、targeted recovery、mirror deferred completion は同じ precondition を通る。
- deferred mirror completion の completion instance を `terminal:<stage>` に安定化し、明示された Intent を receipt 検証にも一貫して使用するようにした。
- Goal lifecycle の4イベントを canonical audit registry、監査仕様、state-machine reference に追加し、workflow completion audit から Goal receipt へ追跡可能にした。
- legacy Completed Intent は無変更で読み取れる一方、再確定時は migration receipt がなければ fail-closed にした。

## テストと検証

- focused Goal / terminal / mirror テスト: 240 pass、0 fail。
- 変更・新規テストのプロセス分離再実行: 全件 pass。追加の completion / audit seam: 63 pass、0 fail。
- complexity / mechanism ratchet と terminal audit ordering の修正後再実行: 41 pass、0 fail。
- terminal recovery fixture `t247`: 27 pass、0 fail。正当な authored approve に valid Goal receipt を与え、production guard は変更していない。
- audit event count と test-size drift: 23 pass、0 fail。Goal lifecycle 4イベント追加後の canonical countを85へ更新し、E2Eの実測sizeを`medium`へ合わせた。
- `bun run typecheck`: 成功。
- `bun run lint`: 成功（既存を含む warning 405件、info 12件。error なし）。
- `bun run distribution:check`: 成功。
- `bun scripts/promote-self.ts --check`: 成功。`package.json` に `promote:self:check` script は存在しないため canonical CLI を使用した。
- `bun run source-only:check`: clean。
- 最終`bun run test:ci`: 809 files、10,765 assertionsがすべて成功した。Failed filesとFailed assertionsはいずれも0で、結果は`PASS`だった。

## Source-only 境界

全8 harness と root self-install 面は parity 検証のため一時生成したが、生成物は Git 追跡対象へ追加していない。正本は `packages/framework/core/` であり、source-only guard は clean である。

## Files created/modified

### Core implementation and reference

- 新規: `packages/framework/core/tools/amadeus-goal-reconciliation.ts`
- 新規: `packages/framework/core/tools/amadeus-goal.ts`
- 変更: `packages/framework/core/tools/amadeus-workflow-completion.ts`
- 変更: `packages/framework/core/tools/amadeus-state.ts`
- 変更: `packages/framework/core/tools/amadeus-orchestrate.ts`
- 変更: `packages/framework/core/tools/amadeus-utility.ts`
- 変更: `packages/framework/core/tools/amadeus-audit.ts`
- 変更: `packages/framework/core/otel/event-registry.ts`
- 変更: `packages/framework/core/knowledge/amadeus-shared/state-template.md`
- 変更: `packages/framework/core/knowledge/amadeus-shared/audit-format.md`
- 変更: `docs/reference/12-state-machine.md`

### Tests and test controls

- 新規: `tests/unit/t427-goal-reconciliation.test.ts`
- 新規: `tests/integration/t427-goal-reconciliation-completion.integration.test.ts`
- 新規: `tests/integration/t428-goal-revision-authority.integration.test.ts`
- 新規: `tests/integration/t429-legacy-goal-migration.integration.test.ts`
- 新規: `tests/e2e/t427-goal-reconciliation-harness-parity.test.ts`
- 変更: `tests/harness/fixtures.ts`
- 変更: `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts`
- 変更: `tests/integration/event-registry-drift.test.ts`
- 変更: `tests/integration/t51.test.ts`、`tests/integration/t247-runtime-recovery.test.ts`、`tests/integration/t48-audit-event-emitters.test.ts`
- 変更: `tests/integration/t-coverage-mechanism-ratchet.test.ts`、`tests/integration/t-solo-gate-transaction-prefix.test.ts`、`tests/integration/t185-stage-artifact-guard.test.ts`、`tests/integration/t265-engine-boundary.integration.test.ts`
- 変更: `tests/unit/t17.test.ts`、`tests/unit/t28-audit-event-sync.test.ts`、`tests/unit/t81.test.ts`、`tests/unit/t115.test.ts`、`tests/unit/t-phase-check-gate-seam.test.ts`、`tests/unit/t-phase-progress-rollup-seam.test.ts`
- 変更: `tests/e2e/t113.test.ts`、`tests/e2e/t265-engine-boundary.test.ts`
- 変更: `tests/.complexity-baseline.json`、`tests/.coverage-ratchet.json`、`tests/.coverage-registry.json`

### Workflow-managed records

- 変更: `amadeus/spaces/default/intents/intents.json`、`amadeus/spaces/default/memory/project.md`、`amadeus/spaces/default/elections/elections.json`
- 新規: 本 Intent record、codekb re-scan、要求強度学習の election record。これらは engine / §13 protocol が管理する履歴であり、application implementation ではない。

## 単一 completion authority の実装証拠

- `authorizeWorkflowCompletion` は副作用を持たない precondition として、final in-scope stage、state が投影する Goal ID / revision / digest、completion instance、scope / execution projection の context digest、receipt の `ACHIEVED` verdict を同じ snapshot で照合する。
- `completeWorkflowForTarget` は state lock 内で上記 authority を最初に呼び、拒否時は artifact guard、completion audit、state、Intent registry、active cursor の変更へ進まない。承認後の terminal state は単一 rename で確定し、audit / registry / cursor は同じ receipt identity へ再実行可能に収束する。
- deferred mirror 経路も mirror operation の発行前に同じ `authorizeWorkflowCompletion` を呼ぶ。したがって receipt 不在・stale・改ざん・非 `ACHIEVED` の場合、Issue close 等の外部作用へ進まない。
- これらの順序は `t427-goal-reconciliation-completion`、`t361-amadeus-mirror-lifecycle-completion`、`t247-runtime-recovery` と failure-injection 系で検証した。

## 計画からの逸脱

- 計画時のテスト番号候補 `t417`〜`t419` は、rebase 後の最新 main で番号が使用済みだったため `t427`〜`t429` に変更した。テスト範囲と要求強度は不変である。
- coverage 実行では、repository の canonical coverage mechanism / complexity ratchet が新規分岐を検知したため、`tests/.coverage-*` と `tests/.complexity-baseline.json` を実測に合わせて更新した。coverage gate 自体は緩和していない。
- `t247-runtime-recovery` の既存 fixture は Goal receipt のない terminal completion を正常系としていたため、production guard を bypass せず、fixture に正当な receipt を追加した。
- Goal lifecycle event 4件の追加に伴い、canonical audit event count を81から85へ更新した。event registry drift guard は維持した。
- harness parity E2E の実測時間が `small` 境界を超えたため test-size annotation を `medium` に修正した。検証内容や timeout を削減していない。
- `package.json` に `promote:self:check` script がなかったため、同じ canonical check を直接 `bun scripts/promote-self.ts --check` で実行した。
- 未実施の計画項目・未実施の正式検証はない。

## 完了状態

コード生成計画の全13ステップと正式検証が完了した。canonical source、全配布面のparity、source-only境界、Goal completion guardの回帰テストがgreenであり、コード生成stageの成果物として承認へ進める状態である。
